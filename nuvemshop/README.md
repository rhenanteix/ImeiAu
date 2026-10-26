# Nuvemshop Integration - Trade-in Widget

Esta integração utiliza **Nuvemshop Scripts API** para injetar o Script Tag automaticamente após instalação, e **Coupon REST API** para criar cupons quando uma cotação for aprovada.

## Pré-requisitos

- Aplicativo registrado na [Nuvemshop Partners](https://partners.nuvemshop.com.br/)
- Node.js 18+
- ngrok ou domínio público para callbacks OAuth

## Estrutura

```
nuvemshop/
├── api/                   # Endpoints da integração
│   ├── auth/             # OAuth2 flow
│   ├── install/          # Pós-instalação
│   └── webhook/          # Webhooks
├── scripts/              # Scripts API
│   ├── inject-script.ts # Injeção do Script Tag
│   └── script-loader.js # Loader do widget
└── README.md
```

## 1. OAuth2 Authentication

### api/auth/callback.js
```javascript
const axios = require('axios');

module.exports = async (req, res) => {
  const { code, store_id } = req.query;
  
  try {
    // Trocar código por access token
    const response = await axios.post('https://www.nuvemshop.com.br/apps/authorize/token', {
      client_id: process.env.NUVEMSHOP_APP_ID,
      client_secret: process.env.NUVEMSHOP_APP_SECRET,
      grant_type: 'authorization_code',
      code: code
    }, {
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Tradein-Widget/1.0'
      }
    });
    
    const { access_token, scope } = response.data;
    
    // Salvar token no banco de dados
    await db.saveStore({
      store_id: store_id,
      access_token: access_token,
      platform: 'nuvemshop',
      installed_at: new Date()
    });
    
    // Redirecionar para painel da loja
    res.redirect(`https://www.nuvemshop.com.br/loja/${store_id}/admin/apps`);
  } catch (error) {
    console.error('OAuth error:', error.response?.data || error.message);
    res.status(500).send('Erro na autenticação');
  }
};
```

### api/auth/install.js
```javascript
const crypto = require('crypto');

module.exports = async (req, res) => {
  const { store_id } = req.query;
  
  // Gerar URL de autorização OAuth2
  const authUrl = `https://www.nuvemshop.com.br/apps/${process.env.NUVEMSHOP_APP_ID}/authorize` +
    `?client_id=${process.env.NUVEMSHOP_APP_ID}` +
    `&redirect_uri=${encodeURIComponent(process.env.NUVEMSHOP_REDIRECT_URI)}` +
    `&scope=${encodeURIComponent('write_scripts,write_coupons,read_products')}`;
  
  res.redirect(authUrl);
};
```

## 2. Scripts API - Injeção Automática

### scripts/inject-script.js
```javascript
const axios = require('axios');

async function injectTradeinScript(storeId, accessToken) {
  try {
    const apiUrl = `https://api.nuvemshop.com.br/v1/${storeId}/scripts`;
    
    const scriptData = {
      event: 'onload',
      src: `${process.env.TRADEIN_WIDGET_CDN_URL}/nuvemshop/script-loader.js`,
      where: 'footer'
    };
    
    const response = await axios.post(apiUrl, scriptData, {
      headers: {
        'Authentication': `bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'User-Agent': 'Tradein-Widget/1.0'
      }
    });
    
    console.log('Script injected successfully:', response.data);
    return response.data;
  } catch (error) {
    console.error('Error injecting script:', error.response?.data || error.message);
    throw error;
  }
}

// Chamar após instalação
module.exports = { injectTradeinScript };
```

### scripts/script-loader.js
```javascript
(function() {
  'use strict';
  
  // Buscar configuração da loja
  const storeId = window.NUVEMSHOP_STORE_ID || '{{STORE_ID}}';
  const apiUrl = '{{TRADEIN_API_URL}}';
  
  // Carregar widget.js
  const script = document.createElement('script');
  script.src = apiUrl + '/widget.js';
  script.defer = true;
  document.head.appendChild(script);
  
  // Aguardar carregamento e inserir widget
  script.onload = function() {
    // Inserir widget na página de produto ou carrinho
    const path = window.location.pathname;
    
    if (path.includes('/produto/') || path.includes('/product/')) {
      // Inserir após informações do produto
      const productInfo = document.querySelector('.product-info, .product-details, .buy-button-box');
      if (productInfo && !document.queryTagName('trade-in-widget')[0]) {
        const widget = document.createElement('trade-in-widget');
        widget.setAttribute('store-id', storeId);
        widget.setAttribute('api-url', apiUrl);
        widget.setAttribute('label', 'Dê seu usado como entrada');
        productInfo.parentNode.insertBefore(widget, productInfo.nextSibling);
      }
    } else if (path.includes('/carrinho') || path.includes('/cart')) {
      // Inserir no carrinho
      const cartSection = document.querySelector('.cart, #cart, .shopping-cart');
      if (cartSection && !document.queryTagName('trade-in-widget')[0]) {
        const widget = document.createElement('trade-in-widget');
        widget.setAttribute('store-id', storeId);
        widget.setAttribute('api-url', apiUrl);
        widget.setAttribute('label', 'Dê seu usado como entrada');
        cartSection.appendChild(widget);
      }
    }
  };
})();
```

## 3. Coupon REST API - Criação de Cupons

### api/coupons/create.js
```javascript
const axios = require('axios');

module.exports = async (req, res) => {
  // Verificar autenticação (pode vir da API Trade-in)
  const authHeader = req.headers.authorization;
  if (authHeader !== `Bearer ${process.env.TRADEIN_SERVICE_TOKEN}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  try {
    const { storeId, quoteId, amount, expiresAt } = req.body;
    
    // Buscar credenciais da loja
    const store = await db.getStore(storeId);
    if (!store || !store.access_token) {
      return res.status(404).json({ error: 'Store not found' });
    }
    
    // Gerar código do cupom
    const couponCode = `TRADEIN-${quoteId.toUpperCase().slice(-8)}-${Date.now().toString().slice(-6)}`;
    
    // Criar cupom via Nuvemshop API
    const apiUrl = `https://api.nuvemshop.com.br/v1/${storeId}/coupons`;
    
    const couponData = {
      code: couponCode,
      type: 'absolute',
      value: (amount / 100).toFixed(2), // Nuvemshop usa reais
      min_price: '0.00',
      valid: true,
      start_date: new Date().toISOString().split('T')[0],
      end_date: expiresAt ? new Date(expiresAt).toISOString().split('T')[0] : 
                new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      usage_limit: 1,
      category: 'tradein'
    };
    
    const response = await axios.post(apiUrl, couponData, {
      headers: {
        'Authentication': `bearer ${store.access_token}`,
        'Content-Type': 'application/json',
        'User-Agent': 'Tradein-Widget/1.0'
      }
    });
    
    res.json({
      success: true,
      coupon: {
        code: response.data.code,
        value: amount,
        currency: 'BRL',
        expiresAt: response.data.end_date
      }
    });
  } catch (error) {
    console.error('Error creating coupon:', error.response?.data || error.message);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to create coupon' 
    });
  }
};
```

## 4. Pós-instalação

### api/install/complete.js
```javascript
const { injectTradeinScript } = require('../../scripts/inject-script');

module.exports = async (req, res) => {
  const { store_id, access_token } = req.body;
  
  try {
    // Injetar script automaticamente após instalação
    await injectTradeinScript(store_id, access_token);
    
    res.json({ 
      success: true, 
      message: 'Trade-in widget installed successfully' 
    });
  } catch (error) {
    console.error('Installation error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to install widget' 
    });
  }
};
```

## 5. Configuração

### .env
```env
NUVEMSHOP_APP_ID=your_app_id
NUVEMSHOP_APP_SECRET=your_app_secret
NUVEMSHOP_REDIRECT_URI=https://your-app.com/auth/callback
TRADEIN_API_URL=https://your-tradein-api.com
TRADEIN_WIDGET_CDN_URL=https://your-tradein-api.com
TRADEIN_SERVICE_TOKEN=your_service_token
```

## 6. Webhooks (Opcional)

Configure webhook para quando cotação for aprovada na API Trade-in, chamando `/api/coupons/create`.

## Notas de Instalação

1. Crie o app no painel Nuvemshop Partners
2. Configure URLs OAuth e permissões (`write_scripts`, `write_coupons`)
3. Faça deploy da integração
4. Após instalação, o script será injetado automaticamente via Scripts API
5. O widget aparecerá na página de produto/carrinho conforme configurado

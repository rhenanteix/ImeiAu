# Trade-in Widget - Multi-platform Packaging

Este pacote contém a estrutura modular para integrar o Widget Trade-in nas 3 principais plataformas:

- **Shopify** - Theme App Extension + Remix App
- **Nuvemshop** - Script Tags via Scripts API + Coupon REST API  
- **WooCommerce** - Plugin PHP WordPress

## Estrutura

```
.
├── shared/           # Configurações e utilitários compartilhados
├── shopify/          # App Shopify (Remix + Theme App Extensions)
├── nuvemshop/        # Scripts e integração OAuth2 Nuvemshop
├── woocommerce/      # Plugin WordPress/WooCommerce
└── docs/             # Documentação e guias de instalação
```

## Widget Base

O widget core está em `/static/widget.js` - um Web Component com Shadow DOM que consome a API FastAPI em `app/main.py`.

## Configuração Comum

Todas as plataformas precisam se comunicar com a mesma API backend. Configure as seguintes variáveis:

```env
TRADEIN_API_URL=https://seu-backend-tradein.com
TRADEIN_ADMIN_TOKEN=seu_token_admin
```

## Quick Start

Veja os READMEs específicos de cada plataforma para instruções detalhadas de instalação e empacotamento.

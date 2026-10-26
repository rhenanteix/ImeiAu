# Shopify App - Trade-in Widget

Este diretório contém a estrutura completa para um Shopify App usando **Remix** (Shopify CLI), **Theme App Extensions** e integração com GraphQL Admin API para criação de cupons dinâmicos.

## Pré-requisitos

- [Node.js](https://nodejs.org/) 18.x ou superior
- [Shopify CLI](https://shopify.dev/docs/apps/tools/cli) 3.x
- Conta de desenvolvedor Shopify Partner
- App criado no Partner Dashboard

## Estrutura

```
shopify/
├── app/                    # Remix App (backend)
│   ├── routes/            # Rotas do app (auth, webhooks, API)
│   ├── shopify.server.ts  # Configuração Shopify Auth
│   └── ...
├── extensions/            # Theme App Extensions
│   └── tradein-button/   # App Block para PDP/Cart
│       ├── blocks/       # Liquid blocks
│       ├── assets/       # JS/CSS
│       └── locales/      # Traduções
├── web/                   # (opcional) Recursos web
├── package.json
├── shopify.app.toml
└── README.md
```

## 1. Criar App com Shopify CLI

```bash
cd shopify
shopify app init
# Ou copiar esta estrutura sobre um app existente
```

## 2. Configuração

### shopify.app.toml
```toml
name = "tradein-widget"
client_id = "YOUR_CLIENT_ID"
application_url = "https://your-app-url.com"
embedded = true

[auth]
redirect_urls = [
  "https://your-app-url.com/auth/callback"
]

[webhooks]
api_version = "2024-10"

[access_scopes]
scopes = "write_discounts,read_products,write_products"
```

### Variáveis de Ambiente (.env)
```env
SHOPIFY_API_KEY=your_api_key
SHOPIFY_API_SECRET=your_api_secret
SCOPES=write_discounts,read_products,write_products
HOST=https://your-app-url.com
TRADEIN_API_URL=https://your-tradein-api.com
TRADEIN_ADMIN_TOKEN=your_admin_token
SESSION_SECRET=generate_random_secret
```

## 3. Theme App Extension - App Block

### extensions/tradein-button/shopify.extension.toml
```toml
api_version = "2024-10"
type = "theme"
name = "Trade-in Button"

[[extensions]]
type = "theme_app_extension"
name = "trade-in-widget"

[extensions.targeting]
module = "./blocks/tradein_button.liquid"
```

### extensions/tradein-button/blocks/tradein_button.liquid
```liquid
{% comment %}
  App Block: Trade-in Widget
  Permite posicionar o botão "Dê seu usado como entrada" na PDP ou Carrinho
{% endcomment %}

<div class="tradein-block" 
     data-store-id="{{ block.settings.store_id | escape }}"
     data-api-url="{{ block.settings.api_url | escape }}"
     data-label="{{ block.settings.button_label | escape }}">
  
  <trade-in-widget 
    store-id="{{ block.settings.store_id | escape }}"
    api-url="{{ block.settings.api_url | escape }}"
    label="{{ block.settings.button_label | escape }}">
  </trade-in-widget>
</div>

<script src="{{ block.settings.widget_script_url | append: '/widget.js' }}" defer></script>

{% schema %}
{
  "name": "Trade-in Widget",
  "target": "section",
  "templates": ["product", "cart"],
  "settings": [
    {
      "type": "text",
      "id": "store_id",
      "label": "Store ID",
      "default": "demo",
      "info": "Identificador da loja no sistema Trade-in"
    },
    {
      "type": "url",
      "id": "api_url",
      "label": "Trade-in API URL",
      "default": "https://your-tradein-api.com",
      "info": "URL base da API Trade-in"
    },
    {
      "type": "text",
      "id": "button_label",
      "label": "Texto do botão",
      "default": "Dê seu usado como entrada"
    },
    {
      "type": "url",
      "id": "widget_script_url",
      "label": "Widget Script URL",
      "default": "https://your-tradein-api.com",
      "info": "URL onde o widget.js está hospedado"
    }
  ]
}
{% endschema %}
```

### extensions/tradein-button/locales/pt-BR.json
```json
{
  "name": "Trade-in Widget",
  "settings": {
    "store_id": {
      "label": "ID da Loja",
      "info": "Identificador da loja no sistema Trade-in"
    },
    "api_url": {
      "label": "URL da API",
      "info": "URL base da API Trade-in"
    },
    "button_label": {
      "label": "Texto do Botão",
      "info": "Texto exibido no botão"
    },
    "widget_script_url": {
      "label": "URL do Script do Widget",
      "info": "URL onde o widget.js está hospedado"
    }
  }
}
```

## 4. App Backend - Criação de Cupons via GraphQL Admin API

### app/shopify.server.ts
```typescript
import "@shopify/shopify-app-remix/adapters/node";
import {
  ApiVersion,
  AppDistribution,
  shopifyApp,
} from "@shopify/shopify-app-remix/server";
import { PrismaSessionStorage } from "@shopify/shopify-app-session-storage-prisma";
import { prisma } from "~/db.server";

const shopify = shopifyApp({
  apiKey: process.env.SHOPIFY_API_KEY,
  apiSecretKey: process.env.SHOPIFY_API_SECRET || "",
  apiVersion: ApiVersion.October24,
  scopes: process.env.SCOPES?.split(","),
  appUrl: process.env.HOST || "",
  authPathPrefix: "/auth",
  sessionStorage: new PrismaSessionStorage(prisma),
  distribution: AppDistribution.AppStore,
  future: {
    unstable_newEmbeddedAuthStrategy: true,
  },
  ...(process.env.SHOP_CUSTOM_DOMAIN
    ? { customShopDomains: [process.env.SHOP_CUSTOM_DOMAIN] }
    : {}),
});

export default shopify;
export const apiVersion = ApiVersion.October24;
export const addDocumentResponseHeaders = shopify.addDocumentResponseHeaders;
export const authenticate = shopify.authenticate;
export const unauthenticated = shopify.unauthenticated;
export const login = shopify.login;
export const registerWebhooks = shopify.registerWebhooks;
export const sessionStorage = shopify.sessionStorage;
```

### app/routes/api.coupons.create.tsx
```typescript
import { json, type ActionFunctionArgs } from "@remix-run/node";
import { authenticate } from "~/shopify.server";

const CREATE_COUPON_MUTATION = `#graphql
  mutation discountCodeBasicCreate($basicCodeDiscount: DiscountCodeBasicInput!) {
    discountCodeBasicCreate(basicCodeDiscount: $basicCodeDiscount) {
      codeDiscountNode {
        id
        codeDiscount {
          ... on DiscountCodeBasic {
            title
            codes(first: 1) {
              nodes {
                code
              }
            }
            startsAt
            endsAt
            customerSelection {
              ... on DiscountCustomerSelectionAll {
                allCustomers
              }
            }
            customerGets {
              value {
                ... on DiscountPercentage {
                  percentage
                }
                ... on DiscountAmount {
                  amount {
                    amount
                    currencyCode
                  }
                }
              }
              items {
                ... on DiscountItemsAll {
                  allItems
                }
              }
            }
            appliesOncePerCustomer
          }
        }
      }
      userErrors {
        field
        code
        message
      }
    }
  }
`;

export const action = async ({ request }: ActionFunctionArgs) => {
  // Autenticação - pode ser authenticated ou com webhook/secret
  const { admin } = await authenticate.admin(request);
  
  try {
    const body = await request.json();
    const { quoteId, amount, currency = "BRL", usageLimit = 1, expiresAt } = body;
    
    // Gerar código único baseado na cotação
    const couponCode = `TRADEIN-${quoteId.toUpperCase().slice(-8)}-${Date.now().toString().slice(-6)}`;
    
    // Converter centavos para valor decimal
    const discountValue = amount / 100;
    
    const variables = {
      basicCodeDiscount: {
        title: `Trade-in Credit - ${quoteId}`,
        code: couponCode,
        startsAt: new Date().toISOString(),
        endsAt: expiresAt || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        customerSelection: {
          allCustomers: true,
        },
        customerGets: {
          value: {
            amount: {
              amount: discountValue,
              currencyCode: currency,
            },
          },
          items: {
            allItems: true,
          },
        },
        appliesOncePerCustomer: true,
        usageLimit: usageLimit,
      },
    };
    
    const response = await admin.graphql(CREATE_COUPON_MUTATION, { variables });
    const result = await response.json();
    
    if (result.data.discountCodeBasicCreate.userErrors.length > 0) {
      return json({ 
        success: false, 
        errors: result.data.discountCodeBasicCreate.userErrors 
      }, { status: 400 });
    }
    
    const discount = result.data.discountCodeBasicCreate.codeDiscountNode;
    const code = discount.codeDiscount.codes.nodes[0].code;
    
    return json({
      success: true,
      coupon: {
        id: discount.id,
        code: code,
        amount: amount,
        currency: currency,
        expiresAt: discount.codeDiscount.endsAt,
      },
    });
  } catch (error) {
    console.error("Error creating coupon:", error);
    return json({ success: false, error: "Failed to create coupon" }, { status: 500 });
  }
};

// Endpoint não-autenticado para ser chamado pela API Trade-in
export const loader = async ({ request }: ActionFunctionArgs) => {
  // Verificar token de serviço
  const authHeader = request.headers.get("Authorization");
  if (authHeader !== `Bearer ${process.env.TRADEIN_SERVICE_TOKEN}`) {
    return json({ error: "Unauthorized" }, { status: 401 });
  }
  
  return json({ error: "Method not allowed" }, { status: 405 });
};
```

### app/routes/webhooks.tradein.approved.tsx
```typescript
import { json, type ActionFunctionArgs } from "@remix-run/node";
import { authenticate } from "~/shopify.server";

export const action = async ({ request }: ActionFunctionArgs) => {
  const authHeader = request.headers.get("Authorization");
  if (authHeader !== `Bearer ${process.env.TRADEIN_WEBHOOK_SECRET}`) {
    return json({ error: "Unauthorized" }, { status: 401 });
  }
  
  try {
    const payload = await request.json();
    const { quoteId, shop, estimatedValue, customerEmail } = payload;
    
    // Chamar endpoint interno para criar cupom
    const response = await fetch(`${process.env.HOST}/api/coupons/create`, {
      method: "POST",
      headers: {
        "Content": "application/json",
      },
      body: JSON.stringify({
        quoteId,
        amount: estimatedValue,
        currency: "BRL",
        expiresAt: new Date(Date.now() + 30 * 24 * tag72 hours * 3600 * 1000).toISOString(),
      }),
    });
    
    const result = await response.json();
    
    if (!result.success) {
      return json({ success: false, error: result.errors }, { status: 400 });
    }
    
    // Enviar cupom para o customer via email (opcional - pode usar Shopify Email) or notify
    return json({ 
      success: true,
      couponCode: result.coupon.code,
    });
  } catch (error) {
    console
;
    return json({ success: false, error: "Internal server error" }, { status: 500 });
  }
};
```

## 5. Instalação e Deploy

```bash
# Instalar dependências
npm install

# Desenvolvimento
shopify app dev

# Deploy
shopify app deploy
```

## Observações

- O App Block funciona tanto na página de produto (PDP) quanto no carrinho conforme configurado
- Cupons são criados via GraphQL Admin API com valor fixo (DiscountAmount)
- Para segurança, use tokens de serviço entre as APIs
- A Theme App Extension não precisa de hospedagem separ</svg> - usa assets do app

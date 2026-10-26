# WooCommerce Plugin - Trade-in Widget

Plugin WordPress completo para integrar o widget Trade-in ao WooCommerce. Utiliza hooks nativos do WooCommerce para renderizar o widget na PDP e carrinho, e aplica descontos via `WC()->cart->add_discount()`.

## Pré-requisitos

- WordPress 5.8+
- WooCommerce 5.0+
- PHP 7.4+

## Estrutura

```
woocommerce/
├── tradein-widget.php          # Arquivo principal do plugin
├── includes/
│   ├── class-tradein-admin.php    # Painel administrativo
│   ├── class-tradein-api.php      # Endpoints REST API
│   ├── class-tradein-coupons.php  # Handler de cupons
│   └── class-tradein-frontend.php # Hooks frontend
├── assets/
│   ├── css/
│   │   └── admin.css
│   └── js/
│       └── frontend.js (opcional)
└── README.md
```

## 1. Instalação

### Método 1: Upload direto
1. Compacte toda a pasta `woocommerce/` em `tradein-widget.zip`
2. No WordPress: Plugins > Adicionar novo > Enviar plugin
3. Ative o plugin "Trade-in Widget for WooCommerce"

### Método 2: FTP
1. Copie a pasta `woocommerce/` para `/wp-content/plugins/tradein-widget/`
2. Renomeie `tradein-widget.php` para manter na raiz ou ajustar
3. Ative o plugin

**Importante:** O arquivo principal deve estar em `wp-content/plugins/tradein-widget/tradein-widget.php`

## 2. Configuração

Após ativação, acesse **Trade-in Widget > Configurações**:

| Campo | Descrição | Exemplo |
|-------|-----------|---------|
| URL da API Trade-in | URL base da API FastAPI | `https://api.tradein.com.br` |
| Store ID | Identificador da loja | `minhaloja` |
| Token Admin | Token para comunicar com API Trade-in | `bearer_token_aqui` |
| Token API WordPress | Token para validar chamadas da API Trade-in | `wp_token_secreto` |
| Texto do Botão | Label do botão do widget | `Dê seu usado como entrada` |
| Exibição | Onde exibir o widget | PDP e/ou Carrinho |

## 3. Hooks Utilizados

### Frontend - Renderização

#### Página de Produto (PDP)
```php
// Hook: woocommerce_before_add_to_cart_form
add_action('woocommerce_before_add_to_cart_form', array($this, 'render_tradein_widget_product'));
```
O widget é renderizado **antes** do formulário "Adicionar ao carrinho".

#### Carrinho
```php
// Hooks: woocommerce_before_cart
add_action('woocommerce_before_cart', array($this, 'render_tradein_widget_cart'));
```
O widget é renderizado **no topo** da página do carrinho.

### Cupons - Aplicação de Desconto

```php
// Hook: woocommerce_cart_calculate_fees
add_action('woocommerce_cart_calculate_fees', array($this, 'apply_tradein_discount'));

// Aplicação via WC()->cart
WC()->cart->add_discount($coupon_code);
```

O desconto é aplicado na **sessão atual do carrinho** usando os métodos nativos do WooCommerce:
- `WC()->session->set()` para armazenar dados do cupom
- `WC()->cart->add_discount()` para aplicar o desconto
- `WC()->cart->calculate_totals()` para recalcular

## 4. API Endpoints REST

O plugin registra rotas REST em `/wp-json/tradein/v1/`:

### POST /wp-json/tradein/v1/coupon/approve
Dispara criação de cupom quando cotação for aprovada pela API Trade-in.

**Headers:**
```http
Authorization: Bearer {TRADEIN_WIDGET_API_TOKEN}
Content-Type: application/json
```

**Body:**
```json
{
  "quoteId": "QTE-123456",
  "storeId": "minhaloja",
  "estimatedValue": 150000,
  "customerEmail": "cliente@example.com"
}
```

**Response:**
```json
{
  "success": true,
  "couponCode": "TRADEIN-123456-789012",
  "amount": 150000,
  "expiresAt": "2024-12-31 23:59:59"
}
```

### POST /wp-json/tradein/v1/quote/received
Recebe informações da cotação criada na API Trade-in.

## 5. AJAX Endpoints

### wp_ajax_apply_tradein_coupon
Aplica cupom trade-in diretamente no carrinho.

```javascript
jQuery.post(ajaxurl, {
  action: 'apply_tradein_coupon',
  nonce: tradeinWidgetConfig.nonce,
  coupon_code: 'TRADEIN-XXX',
  amount: 150000
}, function(response) {
  if (response.success) {
    location.reload();
  }
});
```

## 6. Banco de Dados

Na ativação, é criada a tabela `wp_tradein_quotes`:

```sql
CREATE TABLE wp_tradein_quotes (
  id bigint(20) NOT NULL AUTO_INCREMENT,
  quote_id varchar(100) NOT NULL,
  store_id varchar(50) NOT NULL,
  customer_email varchar(100),
  device_info text,
  estimated_value int(11),
  coupon_code varchar(50),
  status varchar(20) DEFAULT 'pending',
  created_at datetime DEFAULT CURRENT_TIMESTAMP,
  updated_at datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY quote_id (quote_id)
);
```

## 7. Teste Rápido

1. Ative o plugin e WooCommerce
2. Configure em Trade-in Widget > Configurações
3. Acesse uma página de produto - o widget deve aparecer antes do botão "Comprar"
4. Acesse o carrinho - o widget deve aparecer no topo
5. Complete uma cotação no widget - o cupom será aplicado via API

## 8. Fluxo Completo

1. **Cliente cota** - Usa widget na PDP/Carrinho, preenche dados
2. **Cria solicitação** - Widget envia para API Trade-in (`/api/v1/tradein/create`)
3. **Aprovação** - Admin aprova na API ou automaticamente conforme configuração
4. **Criação de cupom** - API Trade-in chama webhook REST do WooCommerce (`/wp-json/tradein/v1/coupon/approve`)
5. **Cupom gerado** - WooCommerce cria cupom do tipo `fixed_cart`
6. **Aplicação** - Cupom é aplicado ao carrinho via sessão e `WC()->cart->add_discount()`
7. **Finalização** - Cupom é marcado como usado após pedido

## Segurança

- Todos os tokens são armazenados em opções do WordPress
- Endpoints REST são protegidos com Bearer token
- AJAX usa nonces do WordPress
- Sanitização e validação de dados em todos os pontos

## Notas

- O widget.js é carregado via URL externa (configurável)
- Funciona com qualquer tema compatível com WooCommerce
- Suporta cache de páginas - o widget é carregado via JavaScript
- Descontos são aplicados na sessão do carrinho, não persistentemente

# Volta · MVP de Trade-in

**Fase 2 disponível:** [Dashboard Next.js + Prisma](merchant/README.md), com configurações por loja, preços, vistoria e contraproposta. O aplicativo Python abaixo permanece como Fase 1.

Landing B2B e Web Component conectados à API FastAPI. PostgreSQL recomendado; SQLite disponível para desenvolvimento sem Docker. Preços, cupons e postagem são demonstrativos. Não há integração real com e-commerce ou Correios.

## Executar

Python 3.11+ (validado com 3.14).

```sh
python3 -m venv .venv
.venv/bin/pip install -r requirements.txt
cp .env.example .env
.venv/bin/uvicorn app.main:app --reload --env-file .env
```

Abra http://localhost:8000. Documentação interativa: http://localhost:8000/docs.
O banco e os dados de exemplo são criados no startup. Não use dados pessoais reais na demonstração.

```sh
.venv/bin/python -m pytest -q
node --check static/widget.js
node --check static/landing.js
```

Para PostgreSQL:

```sh
docker compose up -d db
```

Altere `DATABASE_URL` em `.env` para `postgresql+psycopg://tradein:tradein@localhost:5432/tradein` e reinicie a API. As credenciais do Compose são apenas locais.

## Estrutura

```text
app/
  main.py          # API, schemas de entrada, cotação, seed e estados
  models.py        # SQLAlchemy: entidades e conexão SQLite/PostgreSQL
static/
  index.html       # Landing B2B sem build
  styles.css       # Layout responsivo
  landing.js       # Captação persistente de leads
  widget.js        # Web Component independente com Shadow DOM
schema.sql         # DDL PostgreSQL gerado a partir dos modelos
tests/test_api.py  # Testes de integração (banco temporário)
compose.yaml       # PostgreSQL local
.env.example
requirements.txt   # Dependências fixadas
```

## Embutir o widget

```html
<script defer src="http://localhost:8000/widget.js"></script>
<trade-in-widget
  api-url="http://localhost:8000"
  store-id="demo"
  label="Troque seu celular por crédito">
</trade-in-widget>
```

Adicione a origem exata da loja a `ALLOWED_ORIGINS` (separadas por vírgula). Em produção use HTTPS. `store-id` é identificador público, nunca uma credencial. Há duas lojas semeadas: `demo` permite cupom instantâneo ou pós-inspeção; `demo-inspection` permite apenas pós-inspeção. Substitua o atributo para testar a restrição. O script não requer bundler e isola seu CSS com Shadow DOM. O modal nativo oferece foco contido e fechamento com Escape.

## Contratos da API

Valores monetários são inteiros em **centavos BRL**. A árvore de aparelhos inclui IDs que identificam modelo e capacidade juntos.

- `GET /api/v1/devices?store_id=demo`: árvore marca → modelo → versões.
- `POST /api/v1/quotes/calculate`: estimativa, descontos e modalidades permitidas.
- `POST /api/v1/tradein/create`: cliente, endereço, condição, modalidade e consentimento; exige cabeçalho `Idempotency-Key` (8–100 caracteres).
- `POST /api/v1/leads`: nome, loja, WhatsApp, e-mail, plataforma e consentimento.
- `PATCH /api/v1/tradein/{id}/status`: operação administrativa com `Authorization: Bearer <ADMIN_TOKEN>`; desabilitada se token estiver ausente.

Exemplo de cotação:

```sh
curl http://localhost:8000/api/v1/quotes/calculate \
  -H 'Content-Type: application/json' \
  -d '{"store_id":"demo","device_id":"iphone13-128","condition":{"powers_on":true,"screen_intact":false,"battery_ok":true}}'
```

Retorna `estimated_value: 135000` (R$ 1.350,00). O iPhone 13 128GB tem base fictícia de R$ 1.800,00. Respostas negativas abatem 60% (não liga), 25% (tela) e 10% (bateria), somados sobre a base, limitados a 100%, com arredondamento em centavos. Não se trata de uma tabela FIPE oficial.

Criação (ver os schemas completos no Swagger):

```json
{
  "store_id": "demo",
  "device_id": "iphone13-128",
  "condition": {"powers_on": true, "screen_intact": true, "battery_ok": true},
  "mode": "instant_coupon",
  "consent": true,
  "customer": {
    "name": "Cliente de teste",
    "email": "teste@example.com",
    "phone": "11999999999",
    "cpf": "52998224725",
    "address": {
      "postal_code": "01001000", "street": "Rua de teste", "number": "123",
      "complement": "", "neighborhood": "Centro", "city": "São Paulo", "state": "SP"
    }
  }
}
```

O servidor recalcula o valor durante a criação; valores enviados pelo cliente são rejeitados. Repetir a mesma chave e corpo retorna a solicitação existente; mudar o corpo com a mesma chave retorna 409. CPF tem validação dos dígitos verificadores, não verificação de identidade. Não há endpoint público que exponha os dados do cliente.

## Estados e concessão

```mermaid
stateDiagram-v2
  [*] --> pending_shipping
  pending_shipping --> shipped
  shipped --> inspecting
  inspecting --> approved
  inspecting --> rejected
```

Instantâneo: gera cupom na criação. Pós-inspeção: `coupon_code` permanece nulo até `approved`. Rejeição remove o cupom simulado. As mudanças exigem token administrativo; aprovação repetida não duplica cupom. A postagem é gerada nas duas modalidades. Todos os códigos começam com `DEMO` e a resposta inclui `simulated: true`.

O mock é local e transacional, sem chamadas externas. Ao integrar provedores reais, extraia adaptadores de cupons por plataforma e de logística; use outbox/fila, idempotência no provedor e reconciliação. A revogação real de um cupom já utilizado exige política comercial específica.

## Schema e próximos passos

`schema.sql` contém as tabelas PostgreSQL. `api_keys` armazena apenas referências a segredos, nunca credenciais em claro. `customer_data` e `condition` são JSON; valores financeiros são inteiros. Há chaves estrangeiras, unicidade por aparelho e chave de idempotência por loja. `create_all` atende à inicialização do MVP, não à evolução do banco: adote migrações Alembic antes de alterações de schema em operação.

Antes de um piloto real: autenticação e autorização por lojista, gestão de configurações, proteção contra abuso/rate limiting, consentimentos versionados, política de retenção e eliminação, proteção dos dados pessoais, antifraude, webhooks autenticados, rastreamento, notificações de aprovação e integrações comerciais. CORS permite embutir o widget, mas não autentica requisições nem impede abuso. O token administrativo global é apenas um mecanismo de desenvolvimento; não o distribua no widget.

Referências técnicas: [FastAPI CORS](https://fastapi.tiangolo.com/tutorial/cors/) e [SQLAlchemy ORM](https://docs.sqlalchemy.org/en/20/orm/).

## Validação realizada

7 testes de integração aprovados com SQLite e verificação de sintaxe dos dois scripts JavaScript. PostgreSQL e interação visual em navegador não foram executados neste ambiente. O TestClient emite um aviso de depreciação do transporte httpx, sem falhas nos testes.

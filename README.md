<p align="center">
  <img src="imeiau.png" alt="Logo ImeiAU" width="150" />
</p>

<h1 align="center">💚 ImeiAU · MVP de Trade-in</h1>

<p align="center">
  <em>Transformando celulares usados em crédito com praticidade e transparência ✨</em>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Python-3.11+-blue?logo=python&logoColor=white" alt="Python" />
  <img src="https://img.shields.io/badge/FastAPI-005571?logo=fastapi" alt="FastAPI" />
  <img src="https://img.shields.io/badge/Next.js-000000?logo=nextdotjs" alt="Next.js" />
  <img src="https://img.shields.io/badge/Prisma-2D3748?logo=prisma" alt="Prisma" />
  <img src="https://img.shields.io/badge/PostgreSQL-316192?logo=postgresql&logoColor=white" alt="PostgreSQL" />
</p>

---

## ✨ Sobre o projeto

O **ImeiAU** é uma solução de *trade-in* B2B que permite que lojas ofereçam a troca de celulares usados por crédito na compra. 

Temos duas versões disponíveis:

- 🐍 **Fase 1 (Python + FastAPI)** - Landing B2B + Web Component
- ⚡ **Fase 2 ([Dashboard Next.js + Prisma](merchant/README.md))** - Configurações por loja, preços, vistoria e contraproposta

> *Os preços, cupons e integrações são apenas demonstrativos. Não há integração real com e-commerces ou Correios.*

---

## 🚀 Como executar (Fase 1)

**Requisitos:** Python 3.11+

```bash
# Criar ambiente virtual
python3 -m venv .venv
source .venv/bin/activate  # Linux/Mac
# .venv\Scripts\activate   # Windows

# Instalar dependências
pip install -r requirements.txt

# Configurar variáveis de ambiente
cp .env.example .env

# Rodar a API
uvicorn app.main:app --reload --env-file .env
```

Acesse: **[http://localhost:8000](http://localhost:8000)**  
Docs interativas: **[http://localhost:8000/docs](http://localhost:8000/docs)**

O banco e os dados de exemplo são criados automaticamente na inicialização.  
**Não use dados pessoais reais nesta demonstração!**

### 🐘 Usando PostgreSQL

```bash
docker compose up -d db
```

Altere `DATABASE_URL` no `.env` para:

```env
DATABASE_URL=postgresql+psycopg://tradein:tradein@localhost:5432/tradein
```

As credenciais do Compose são apenas para uso local.

### 🧪 Testes

```bash
.venv/bin/python -m pytest -q
node --check static/widget.js
node --check static/landing.js
```

---

## 🗂 Estrutura do projeto

```text
ImeiAU/
├── app/           # API FastAPI, schemas, cotação, seed e regras
├── static/        # Landing page, estilos e Web Component
├── tests/         # Testes de integração
├── merchant/      # Dashboard Next.js (Fase 2)
├── imeiau.png     # Logo do projeto
└── compose.yaml   # PostgreSQL local
```

---

## 🧩 Embutindo o Widget

Basta adicionar o script e o componente na sua página:

```html
<script defer src="http://localhost:8000/widget.js"></script>
<trade-in-widget
  api-url="http://localhost:8000"
  store-id="demo"
  label="Troque seu celular por crédito">
</trade-in-widget>
```

- Adicione a origem exata da loja em `ALLOWED_ORIGINS` (separadas por vírgula)
- Em produção, use **HTTPS**
- `store-id` é um identificador público, **nunca uma credencial**
- Lojas semeadas: `demo` (cupom instantâneo ou pós-inspeção) e `demo-inspection` (apenas pós-inspeção)
- Feito com **Shadow DOM** para isolamento total de CSS
- Modal acessível com foco contido e fechamento via `Esc`

---

## 📡 Contratos da API

> Valores monetários são sempre em **centavos BRL**.  
> A árvore de aparelhos identifica modelo e capacidade juntos.

| Método | Endpoint | Descrição |
| --- | --- | --- |
| `GET` | `/api/v1/devices?store_id=demo` | Lista marcas → modelos → versões |
| `POST` | `/api/v1/quotes/calculate` | Calcula estimativa com descontos por condição |
| `POST` | `/api/v1/tradein/create` | Cria solicitação de trade-in (requer `Idempotency-Key`) |
| `POST` | `/api/v1/leads` | Captura lead da landing page |
| `PATCH` | `/api/v1/tradein/{id}/status` | Atualiza status (requer `Authorization: Bearer <ADMIN_TOKEN>`) |

### Exemplo de cotação

```bash
curl http://localhost:8000/api/v1/quotes/calculate \
  -H 'Content-Type: application/json' \
  -d '{"store_id":"demo","device_id":"iphone13-128","condition":{"powers_on":true,"screen_intact":false,"battery_ok":true}}'
```

```json
{
  "estimated_value": 135000
}
```

**R$ 1.350,00** para um iPhone 13 128GB com base fictícia de **R$ 1.800,00**.

*Descontos:* Não liga (-60%) • Tela trincada (-25%) • Bateria ruim (-10%)  
*Os descontos são cumulativos e limitados a 100%. Valores arredondados em centavos. Não é uma tabela FIPE oficial.*

---

<p align="center">
  Feito com 💚 pela equipe ImeiAU
</p>

# Documentação do Trade-in

## Fase 2 — Dashboard administrativo

[Guia completo de execução, arquitetura e API](merchant/README.md).

- [Schema Prisma](merchant/prisma/schema.prisma) e [migrations PostgreSQL](merchant/prisma/migrations/)
- [Endpoints REST e autorização](merchant/src/lib/api.ts)
- [Cotação e validação](merchant/src/lib/domain.ts)
- [Inspeção, contraproposta e transações](merchant/src/lib/service.ts)
- [Outbox e webhooks](merchant/src/lib/outbox.ts)
- [Componentes do dashboard](merchant/src/components/)
- [Testes de API e navegador](merchant/tests/e2e/merchant.spec.ts)

A Fase 2 usa banco próprio. Aponte o widget para a API Next.js para aplicar as configurações do dashboard. Integrações financeiras, mensagens e logística permanecem simuladas, com gateway de webhook preparado para integração.

## Fase 1 — MVP original

[README original](README.md), [API FastAPI](app/main.py), [modelos SQLAlchemy](app/models.py), [widget](static/widget.js) e [landing page](static/index.html).

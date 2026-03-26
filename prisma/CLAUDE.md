# Prisma — regras

## Schema
- Usar `cuid()` para todos os IDs — nunca auto-increment
- Sempre incluir `createdAt DateTime @default(now())`
- Modelos que atualizam frequentemente incluem `updatedAt DateTime @updatedAt`
- Enums em inglês, UPPER_SNAKE_CASE

## Migrations
- Nomes descritivos: `init_schema`, `add_booking_status`
- Nunca editar migration já aplicada — criar nova
- Sempre rodar `npx prisma generate` após mudar o schema

## Regras críticas de negócio
- Booking: validação de conflito usa transação atômica
- Ticket HIGH/URGENT: muda Space.status para MAINTENANCE na mesma transação
- Ticket DONE: volta Space.status para ACTIVE na mesma transação

## O que nunca criar
- Modelos financeiros: Invoice, Payment, Subscription, Plan
- Campos de cartão de crédito ou dados bancários
# Prisma — regras

## Schema
- Usar `cuid()` para todos os IDs — nunca auto-increment
- Sempre incluir `createdAt DateTime @default(now())`
- Modelos que atualizam frequentemente incluem `updatedAt DateTime @updatedAt`
- Enums em inglês, UPPER_SNAKE_CASE
- Prisma 7 — URL do banco fica em prisma.config.ts, não no schema.prisma
- datasource só tem `provider = "postgresql"`, sem url

## Migrations
- Nomes descritivos: `init_schema`, `add_service_orders`
- Nunca editar migration já aplicada — criar nova
- Sempre rodar `npx prisma generate` após mudar o schema

## Arquitetura multi-unidade
- Tudo se conecta via unitId (exceto User.unitId que é opcional)
- Admin não precisa de unidade fixa — vê tudo
- Receptionist tem unitId obrigatório — vê só sua unidade
- Space só existe no coworking (UnitType.COWORKING)
- Booking só existe vinculado a Space (só coworking)
- ServiceOrder existe em todas as unidades

## Regras críticas de negócio
- Booking: validação de conflito usa transação atômica
- ServiceOrder HIGH/URGENT com SLA — prazo rastreado por approvedAt
- ServiceOrder precisa de approvedById + approvedAt para rastrear aprovação
- Índice composto em Booking: [spaceId, startTime, endTime]

## O que nunca criar
- Modelos financeiros: Invoice, Payment, Subscription, Plan
- Campos de cartão de crédito ou dados bancários
- Ticket — foi substituído por ServiceOrder

## Prisma 7 — adapter obrigatório

Prisma 7 requer `@prisma/adapter-pg` para conectar ao PostgreSQL.
Instalar: `npm install @prisma/adapter-pg pg`
Tipos: `npm install -D @types/pg`

Isso é necessário no `src/lib/db.ts` quando for criado.
Sem o adapter, o PrismaClient não consegue conectar.

## Seed

Prisma 7 lê a configuração do seed em `prisma.config.ts`, não no `package.json`.
Usar `tsx` em vez de `ts-node` para executar o seed.
Rodar com: `npx prisma db seed`

# CLAUDE.md — Coworkingfy

> Leia este arquivo antes de qualquer ação no projeto.
> Atualize após cada decisão importante ou obstáculo resolvido.

---

## O projeto

Sistema SaaS de gestão operacional de coworking.
Sem funcionalidades financeiras de nenhum tipo.
Referência completa de features e regras de negócio: `docs/IDEA.md`.

## Perfis de usuário

- ADMIN — acesso total a todas as unidades
- RECEPTIONIST — acesso às suas unidades; cria OS, atualiza status, cadastra prestadores
- MEMBER — só coworking; faz e acompanha suas reservas (sem acesso a tickets, OS ou prestadores)

---

## Stack real do projeto

| Camada | Tecnologia | Versão |
|---|---|---|
| Framework | Next.js App Router | 16.2.1 |
| Linguagem | TypeScript | 5 |
| Estilização | Tailwind CSS | 3 |
| Componentes | shadcn/ui | latest |
| ORM | Prisma | 7 |
| Banco | PostgreSQL via Supabase | — |
| Autenticação | NextAuth.js | v5 beta |
| Validação | Zod | 4 |
| Testes | Vitest + Testing Library | — |
| CI | GitHub Actions | — |

---

## Estrutura do projeto

```
coworkingfy/
├── .claude/
│   └── settings.json           ← permissões do agente
├── .github/
│   └── workflows/ci.yml        ← lint + tests + build
├── docs/
│   ├── IDEA.md                 ← regras de negócio (fonte de verdade)
│   └── CLAUDE.md               ← este arquivo (cópia em docs/)
├── prisma/
│   ├── schema.prisma           ← modelos do banco
│   ├── prisma.config.ts        ← URL de conexão para CLI (migrate, studio, seed)
│   ├── seed.ts                 ← dados iniciais
│   └── migrations/             ← todas as migrations SQL manuais
├── src/
│   ├── app/                    ← App Router Next.js
│   │   ├── (auth)/             ← login
│   │   ├── (dashboard)/        ← área autenticada
│   │   └── api/                ← API Routes
│   ├── components/
│   │   ├── shared/             ← componentes do projeto
│   │   └── ui/                 ← shadcn/ui (nunca editar diretamente)
│   ├── lib/                    ← helpers, db, auth, constants
│   ├── tests/                  ← testes Vitest
│   └── proxy.ts                ← RBAC e proteção de rotas (Next.js 16)
├── CLAUDE.md                   ← este arquivo (raiz)
├── .env                        ← variáveis de ambiente (nunca commitar)
└── .env.example                ← modelo sem valores reais
```

---

## Regras de negócio críticas

### Reservas
- Validação de conflito é obrigatória e deve usar transação atômica no Prisma
- A verificação de conflito ocorre na **aprovação**, não na criação pelo MEMBER
- Espaço em MAINTENANCE ou INACTIVE não aceita reserva
- Cancelamento de CONFIRMED permitido até `CANCEL_HOURS_BEFORE` horas antes (padrão 2h via env)
- Duração mínima: 30 minutos; horário: 7h–22h

### Tickets e OS
- Ticket tem prioridade (LOW/MEDIUM/HIGH/URGENT) e é pai de N Ordens de Serviço
- OS pode ser corretiva (vinculada a Ticket) ou preventiva (gerada pelo motor de PMOC, sem Ticket)
- Duplo SLA em horas úteis, calculado na aprovação: atendimento + resolução
- `startedAt`, `completedAt`, `cancelledAt`, `validatedAt` são setados automaticamente nas transições

### Permissões RBAC
- Toda rota de API usa `withAuth()` de `src/lib/rbac.ts` — nunca `auth()` direto
- MEMBER só acessa seus próprios dados: `userId === session.user.id`
- ADMIN não tem unidade fixa — filtra tudo sem restrição de `unitId`
- RECEPTIONIST filtra por `{ unitId: { in: session.user.unitIds } }`

---

## Padrões de código

### TypeScript
- Nunca usar `any` — sempre tipar explicitamente
- Preferir `interface` para objetos, `type` para unions e primitivos

### Componentes Next.js
- Server Components por padrão — Client Components só quando necessário
- Client Components só quando: eventos DOM, useState, useEffect
- Motivo obrigatório em comentário quando usar `'use client'`

### API Routes — padrão obrigatório
```typescript
import { withAuth } from "@/lib/rbac";

export const GET  = withAuth(async (req, session) => { ... });
export const POST = withAuth(async (req, session) => { ... }, ["ADMIN"]);
export const PUT  = withAuth(async (req, session) => { ... }, ["ADMIN", "RECEPTIONIST"]);
```

### Formulários
- react-hook-form + Zod em todos os formulários
- Validação no cliente E no servidor (API Route)
- `z.number()` + `{ valueAsNumber: true }` no register — nunca `z.coerce.number()` (Zod v4 infere `unknown`)
- `z.array(...).default([])` causa erro no Resolver — usar `defaultValues` no `useForm` em vez disso
- Enums no Zod v4: usar `z.enum(EnumObject)` — `z.nativeEnum()` não existe no Zod v4

### Erros
```typescript
import { AppError } from "@/lib/errors";
throw new AppError("Mensagem", "CODE", 409);
// No catch:
if (e instanceof AppError) return NextResponse.json({ error: e.message, code: e.code }, { status: e.status });
```

### Notificações (mutations em Client Components)
```typescript
import { toast } from "sonner";
toast.success("Ação realizada.");
toast.error(json.error ?? "Erro ao processar.");
```

### Paginação
```typescript
const page = Math.max(1, parseInt(pageParam ?? "1", 10) || 1);
const skip = (page - 1) * PAGE_SIZE; // PAGE_SIZE = 20
<Pagination page={page} totalPages={Math.ceil(total / PAGE_SIZE)} searchParams={sp} />
```

### CSS — scrollbar oculta
Usar a classe `.no-scrollbar` (definida em `globals.css`) — não usar classes Tailwind arbitrárias
com `[&::-webkit-scrollbar]:hidden` pois causam hydration mismatch.

---

## O que NUNCA fazer

- Adicionar funcionalidades financeiras (pagamentos, faturas, mensalidades)
- Usar `any` no TypeScript
- Commitar o arquivo `.env`
- Rodar `npm audit fix --force` sem revisar breaking changes
- Usar `auth()` diretamente nas API Routes — sempre usar `withAuth()`
- Usar `z.coerce.number()` ou `z.nativeEnum()` — incompatíveis com Zod v4
- Adicionar `url = env("DATABASE_URL")` no schema.prisma (Prisma 7 não aceita)
- Criar ou referenciar `middleware.ts` — em Next.js 16, apenas `proxy.ts` é válido

---

## Ambiente de desenvolvimento

### Banco de dados
- Supabase PostgreSQL — região São Paulo (sa-east-1)
- Usar Session Pooler (não Direct Connection) — rede local é IPv4
- Host: `aws-1-sa-east-1.pooler.supabase.com:5432`
- Usuário: `postgres.swpsofjcrjhfzpamalbv`
- Senha: alfanumérica simples (sem `@`, `#`, `$` — quebra a URL)

### Migrations
- **NUNCA** usar `npx prisma migrate dev` — causa erro P3006 (shadow database + enum ADD VALUE)
- **SEMPRE** escrever SQL manualmente e aplicar com `npx prisma migrate deploy`
- Após qualquer mudança no schema: `npx prisma generate`
- Turbopack mantém cache velho após `generate` — reiniciar o servidor com `npm run dev`

### Comandos do projeto
```bash
npm run dev                    # servidor local (Turbopack)
npm test                       # rodar testes uma vez
npm run test:watch             # testes em modo watch
npm run test:coverage          # cobertura de testes
npx prisma migrate deploy      # aplicar migrations
npx prisma generate            # regenerar cliente após schema
npx prisma studio              # visualizar banco
npx prisma db seed             # popular banco com dados iniciais
```

### Branches
```
main      → código estável, nunca desenvolver aqui
dev       → integração de features
feature/* → cada nova funcionalidade
fix/*     → correções de bugs
```

---

## Decisões técnicas permanentes

### Prisma 7 — runtime via adapter
PrismaClient não aceita `datasourceUrl` no construtor nem `url` no schema.
Conexão feita exclusivamente via `@prisma/adapter-pg` em `src/lib/db.ts`.
`prisma.config.ts` serve apenas para CLI (migrate, studio, seed) — nunca para runtime.

### NextAuth v5 — tokens e session
- Server Components → `auth()` de `@/lib/auth`
- Client Components → `signIn/signOut` de `next-auth/react`
- `session.user.unitIds` é `string[]` (array de unidades do usuário)
- Type assertions manuais no callback session (augmentação de módulo não funciona no v5 beta)

### Next.js 16 — proxy.ts
- `proxy.ts` é a convenção ativa (substitui `middleware.ts`)
- `middleware.ts` **não deve existir** — gera aviso de deprecação
- `proxy.ts` roda em Node.js automaticamente — não adicionar `export const runtime`

### Zod v4 — diferenças da v3
- `z.nativeEnum()` não existe → usar `z.enum(EnumObject)` para enums do Prisma
- `z.coerce.number()` infere tipo `unknown` → usar `z.number()` com `{ valueAsNumber: true }`
- `z.array().default([])` cria discrepância de tipos no Resolver → usar `defaultValues` no useForm

### RECEPTIONIST — múltiplas unidades
- Tabela pivot `UserUnit` (userId + unitId, `@@unique`)
- `session.user.unitIds: string[]`
- ADMIN tem `unitIds = []` (sem restrição)
- Verificar unidade **apenas para RECEPTIONIST**, nunca para ADMIN:
  ```typescript
  if (role === "MEMBER") return null;
  if (role === "RECEPTIONIST" && !unitIds.includes(unitId)) return null;
  ```

### SLA — horas úteis (seg–sex 08h–18h)
- `src/lib/businessHours.ts` — `addBusinessHours()` e `businessHoursBetween()`
- `src/lib/constants.ts` — `SLA_ATTENDANCE` e `SLA_RESOLUTION` (Record<Priority, number>)
- Dois campos no schema: `slaAttendanceDeadline` e `slaResolutionDeadline`
- Calculados na transição para APPROVED

### Supabase Storage — dois buckets
- `os-photos` — público, fotos de OS (URL direta)
- `unit-documents` — **privado**, contratos e documentos de unidade
  - `documentUrl` na DB armazena o **path** do arquivo (ex: `unitId/ITEM_TYPE/timestamp.pdf`)
  - URL pública **nunca** é armazenada — sempre gerar signed URL sob demanda (`getUnitDocumentSignedUrl()`, 1h)
  - Upload via `uploadUnitDocument(file, unitId, itemType)` em `src/lib/supabase-storage.ts`

### Checklist de Implantação de Unidade
- Model `UnitChecklistItem` com enum `UnitChecklistItemType` (6 tipos: UNIT_CONTRACT, CLEANING_CONTRACT, INTERNET_CONTRACT, EQUIPMENT_INVENTORY, LEASE_CONTRACT, PRINTER_CONTRACT)
- `@@unique([unitId, itemType])` — um item por tipo por unidade (upsert)
- API: `GET/POST /api/units/[id]/checklist` — ADMIN e RECEPTIONIST (RECEPTIONIST só suas unidades)
- Componente: `UnitChecklist` em `src/components/shared/UnitChecklist.tsx`
- `EQUIPMENT_INVENTORY` mostra contagem de ativos + link para `/dashboard/admin/assets?unitId=X`
- Inicialização lazy obrigatória para Supabase client (não instanciar no topo do módulo)

### Planos de Manutenção — providerId e cron
- `MaintenancePlan.providerId` — prestador padrão; quando OS gerada pelo cron é APPROVED, o prestador recebe magic link por email
- Cron `GET /api/cron/maintenance` apenas avança `nextRunAt` quando OS é **criada** (não quando skipped)
- OS gerada pelo cron recebe `providerId` do plano
- Aba "Recorrentes" no calendário filtra por `maintenancePlanId !== null` (não por `provider.type`)
- `isPlanAlert: true` quando OS tem `maintenancePlanId` e status DRAFT/PENDING_APPROVAL — exibe badge âmbar
- Timeline de execuções: `PlanExecutionTimeline` em `src/components/shared/PlanExecutionTimeline.tsx`

### GitHub — duas contas
- URL com usuário embutido: `https://LuizMRBsantos@github.com/LuizMRBsantos/coworkingfy.git`
- Token com escopos: `repo` + `workflow`

---

## Deploy — Vercel

- `vercel.json`: `buildCommand = "npx prisma generate && npm run build"`, `region = "gru1"`
- CI: `.github/workflows/ci.yml` — lint + tests + build em cada push para `main` e `dev`
- Migrations em produção: `DATABASE_URL="..." npx prisma migrate deploy` (rodar localmente antes do deploy)
- `AUTH_TRUST_HOST` não é necessária na Vercel — adicionar apenas em Railway/VPS

### Variáveis de ambiente obrigatórias
```
DATABASE_URL          → Supabase Session Pooler
AUTH_SECRET           → openssl rand -base64 32
AUTH_URL              → https://coworkingfy.vercel.app
CANCEL_HOURS_BEFORE   → 2
CRON_SECRET           → secret para autenticar o cron de manutenção
```

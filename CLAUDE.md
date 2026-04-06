# CLAUDE.md — Coworkingfy

> Leia este arquivo antes de qualquer ação no projeto.
> Atualize após cada decisão importante ou obstáculo resolvido.

---

## O projeto

Sistema SaaS de gestão operacional de coworking.
Sem funcionalidades financeiras de nenhum tipo.
Referência completa de features e regras de negócio: `docs/IDEA.md`.

## Perfis de usuário

- ADMIN — acesso total
- RECEPTIONIST — reservas e tickets do dia a dia
- MEMBER — próprias reservas e abertura de tickets

---

## Stack definida

| Camada | Tecnologia | Versão |
|---|---|---|
| Framework | Next.js App Router | 14 |
| Linguagem | TypeScript | 5 |
| Estilização | Tailwind CSS | 3 |
| Componentes | shadcn/ui | latest |
| ORM | Prisma | 6 |
| Banco | PostgreSQL via Supabase | — |
| Autenticação | NextAuth.js | v5 beta |
| Validação | Zod | 3 |
| Testes | Vitest + Testing Library | — |
| CI | GitHub Actions | — |

---

## Estrutura do projeto
```
coworkingfy/
├── .claude/
│   └── settings.json       ← permissões do agente
├── .github/
│   └── workflows/
│       └── ci.yml          ← pipeline CI
├── docs/
│   ├── IDEA.md             ← regras de negócio
│   ├── CLAUDE.md           ← este arquivo
│   └── TASKS.md            ← plano completo de tasks
├── prisma/
│   └── schema.prisma       ← modelos do banco
├── src/
│   ├── app/                ← App Router Next.js
│   ├── components/         ← componentes React
│   ├── lib/                ← helpers, db client, auth
│   ├── tests/              ← testes Vitest
│   └── types/              ← tipos TypeScript globais
├── AGENTS.md               ← regras técnicas Next.js
├── .env                    ← variáveis de ambiente (nunca commitar)
└── .env.example            ← modelo sem valores reais
```

---

## Regras de negócio críticas

### Reservas
- Validação de conflito é obrigatória e deve usar transação atômica no Prisma
- Espaço com status MAINTENANCE não aceita novas reservas
- Cancelamento permitido até 2 horas antes (variável: CANCEL_HOURS_BEFORE=2)
- Duração mínima: 30 minutos
- Horário de funcionamento: 7h–22h

### Tickets de manutenção
- Ticket com prioridade HIGH ou URGENT muda espaço para MAINTENANCE automaticamente
- Fechar ticket (status DONE) volta espaço para ACTIVE automaticamente
- Usar transação Prisma para garantir atomicidade (ticket + espaço juntos)

### Permissões RBAC
- Toda rota de API verifica sessão primeiro — retorna 401 se ausente
- Verifica role segundo — retorna 403 se insuficiente
- MEMBER só acessa seus próprios dados: userId === session.user.id

---

## Padrões de código

### TypeScript
- Nunca usar `any` — sempre tipar explicitamente
- Preferir `interface` para objetos, `type` para unions e primitivos

### Componentes Next.js
- Server Components por padrão — Client Components só quando necessário
- Client Components só quando: eventos DOM, useState, useEffect
- Formulários: react-hook-form + Zod

### API Routes
- Shape de erro consistente: `{ error: string, code?: string }`
- Sempre validar body com Zod antes de tocar no banco

### Testes
- Todo endpoint crítico tem teste de caminho feliz + erro
- Testar RBAC: MEMBER não acessa rotas de ADMIN
- Testar conflito de reserva obrigatoriamente

---

## O que NUNCA fazer

- Adicionar funcionalidades financeiras (pagamentos, faturas, mensalidades)
- Usar `any` no TypeScript
- Commitar o arquivo `.env`
- Rodar `npm audit fix --force` sem revisar breaking changes
- Criar state machines complexas — manter lógica simples e direta
- Separar backend/frontend em projetos diferentes

---

## Ambiente de desenvolvimento

### Banco de dados
- Supabase PostgreSQL — região São Paulo (sa-east-1)
- Usar Session Pooler (não Direct Connection) — rede local é IPv4
- String de conexão usa porta 5432 via pooler
- Senha do banco: sem caracteres especiais (@, #, $) para evitar erro de URL encoding

### Comandos do projeto
```bash
npm run dev              # servidor local
npm test                 # rodar testes uma vez
npm run test:watch       # testes em modo watch
npm run test:coverage    # cobertura de testes
npx prisma migrate dev   # nova migration
npx prisma studio        # visualizar banco
npx prisma db seed       # popular banco com dados iniciais
npx prisma generate      # regenerar cliente após schema
```

### Branches
```
main      → código estável, nunca desenvolver aqui
dev       → integração de features
feature/* → cada nova funcionalidade
fix/*     → correções de bugs
```

---

## Decisões e lições aprendidas

### [Fase 0] Stack escolhida
Next.js fullstack (App Router) em vez de separar frontend/backend.
Motivo: reduz complexidade operacional — um repositório, um deploy.

### [Fase 0] Ambiente WSL
Projeto vive em `/home/luizsantos/projetos/coworkingfy` no Ubuntu/WSL2.
VSCode conectado ao WSL via extensão Remote WSL.
Nunca mover o projeto para `/mnt/c/...` — lento e problemático.

### [Fase 0] GitHub — duas contas
Máquina tem duas contas GitHub (faculdade e pessoal).
Solução: URL com usuário embutido:
`https://LuizMRBsantos@github.com/LuizMRBsantos/coworkingfy.git`
Token com escopos: `repo` + `workflow`.

### [Fase 1] Vulnerabilidades npm audit
11 vulnerabilidades na instalação do Prisma — todas em devDependencies internas
(hono, @prisma/dev, lodash). Não afetam produção.
Decisão: não corrigir agora. Rever quando Prisma lançar versão estável.

### [Fase 1] Conexão Supabase
Direct Connection (porta 5432) não funciona — rede local usa IPv4.
Solução: usar Session Pooler.
Host: `aws-1-sa-east-1.pooler.supabase.com:5432`
Usuário: `postgres.swpsofjcrjhfzpamalbv`

### [Fase 1] Senha do banco
Senha com caracteres especiais quebra a DATABASE_URL.
Solução: usar senha alfanumérica simples.

### [Fase 1] Prisma 7 — configuração do datasource
Prisma 7 não aceita `url` no schema.prisma.
A DATABASE_URL fica em prisma.config.ts via defineConfig.datasource.url.
O schema.prisma tem apenas `provider = "postgresql"` no datasource.
Nunca adicionar `url = env("DATABASE_URL")` no schema.prisma.

### [Decisão pós Dia 1] Substituir Ticket por ServiceOrder
O modelo Ticket foi substituído por ServiceOrder (OS) com fluxo de aprovação.
Motivo: o caso de uso real é gestão de prestadores externos com aprovação do gestor.

Fluxo: DRAFT → PENDING_APPROVAL → APPROVED → IN_PROGRESS → DONE
       ou REJECTED / CANCELLED em qualquer etapa

Novo modelo necessário: Provider (prestador de serviço externo)
Campos: nome, especialidade, telefone, email, tipo (RECURRING/PUNCTUAL), status

A migration atual tem o modelo Ticket — amanhã criar nova migration
substituindo Ticket por ServiceOrder e adicionando Provider.

### [Dia 2] Arquitetura multi-unidade
Sistema gerencia 5 unidades: 1 coworking + 4 BTS.
Modelo Unit adicionado ao schema — tudo se conecta via unitId.
Coworking: reservas + OS. BTS: só OS e SLA.
Admin vê todas as unidades. Receptionist vê só a sua.
Unidades reais: Coworking, Prudential CG, Prudential Dourados,
Prudential Ipatinga, Stefanini CG

# Código fonte — regras

## Componentes Next.js
- Server Components por padrão — nunca adicionar 'use client' sem motivo
- Client Components só quando necessário: eventos DOM, useState, useEffect
- Motivo obrigatório em comentário quando usar 'use client'

## Imports
- Sempre usar alias @/ — nunca caminhos relativos ../../
- Ordem: externos → internos → tipos

## TypeScript
- Nunca usar `any` — sempre tipar explicitamente
- Preferir `interface` para objetos, `type` para unions

## Formulários
- react-hook-form + Zod para todos os formulários
- Validação no cliente E no servidor (API Route)

## Estilização
- Tailwind CSS para layout e spacing
- shadcn/ui para componentes de interface
- Nunca CSS inline — sempre classes Tailwind

## Prisma no código
- Sempre usar o singleton do src/lib/db.ts
- Nunca instanciar PrismaClient diretamente nos componentes
- Prisma 7 requer @prisma/adapter-pg — já configurado no db.ts

## API Routes
- Verificar sessão primeiro → 401 se ausente
- Verificar role segundo → 403 se insuficiente
- Validar body com Zod antes de tocar no banco
- Shape de erro consistente: { error: string, code?: string }

### [Fase 2] Autenticação implementada
Arquivos criados:
- src/lib/db.ts — singleton PrismaClient com PrismaPg adapter
- src/lib/auth.ts — NextAuth v5 Credentials + JWT com role e unitId
- src/app/api/auth/[...nextauth]/route.ts — handlers GET e POST
- src/app/page.tsx — redireciona / para /login ou /dashboard
- src/app/(auth)/login/page.tsx — formulário com react-hook-form + Zod
- src/app/(dashboard)/dashboard/page.tsx — página mínima com sessão

Dependências instaladas:
- shadcn/ui (Tailwind v4 detectado automaticamente)
- react-hook-form + @hookform/resolvers
- Componentes: button, card, input, label

Status: dev server rodando sem erros, redirect 307 funcionando.
Próximo passo: testar login no browser e implementar middleware de proteção.

### [Fase 2] Decisões técnicas importantes

**Prisma 7 runtime:**
PrismaClient não aceita url no schema nem datasourceUrl no construtor.
Conexão feita via @prisma/adapter-pg explícito em src/lib/db.ts.
Vale para seed, db.ts e qualquer ponto que instancie o client.

**prisma.config.ts é só para CLI:**
URL de conexão só para migrate, seed e studio.
Runtime lê via adapter — nunca via prisma.config.ts.

**NextAuth v5 — onde usar cada função:**
- Server Components → auth() de @/lib/auth
- Client Components → signIn/signOut de next-auth/react

**Zod 4 instalado (4.3.6):**
Stack documenta Zod 3 mas API básica é compatível.
Se surgir incompatibilidade, investigar e documentar aqui.

**AUTH_SECRET:**
NextAuth v5 usa AUTH_SECRET no .env (não NEXTAUTH_SECRET).
Gerar com: openssl rand -base64 32
Adicionar no .env antes de testar login.

**Next.js 16.2.1 — proxy.ts em vez de middleware.ts:**
Next.js 16 deprecou a convenção middleware.ts em favor de proxy.ts.
O arquivo de proteção de rotas é src/proxy.ts (não src/middleware.ts).
Se encontrar referências antigas a middleware.ts, renomear para proxy.ts.
O runtime do proxy deve ser forçado para Node.js: export const runtime = "nodejs"
(NextAuth com Prisma/bcrypt não roda no Edge Runtime).

### [Fase 3] API de Service Orders completa
Arquivos criados:
- src/lib/validations/service-order.ts — schemas Zod
- src/app/api/service-orders/route.ts — GET + POST
- src/app/api/service-orders/[id]/route.ts — GET + PUT
- src/tests/api/service-orders.test.ts — 14 testes

Decisões técnicas:
- Número sequencial OS-{ANO}-{NNNN} gerado em transação com retry (3x)
- Máquina de estados em TRANSITIONS com from + allowedRoles
- SLA calculado em horas: URGENT=24h, HIGH=48h, MEDIUM=120h, LOW=360h
- Filtro por unidade: ADMIN vê tudo, RECEPTIONIST vê só sua unidade

Fix CI:
- Adicionado step "npx prisma generate" no ci.yml
- Sem esse step o CI falha com "Cannot find module .prisma/client/default"

Status atual:
- API de OS testada e funcionando localmente
- CI corrigido — aguardando confirmação do GitHub Actions
- Próximo passo: UI das Ordens de Serviço

## [Fase 3] Refatoração do schema — Ticket + ServiceOrder

Arquitetura final:
- Ticket (SLA) → criado pelo ADMIN a partir do chamado do cliente
- ServiceOrder (OS) → criada pela RECEPTIONIST vinculada ao Ticket
- 1 Ticket pode ter N ServiceOrders

Mudanças no schema:
- Priority movida de ServiceOrder para Ticket
- ServiceOrder.ticketId obrigatório
- ServiceOrder.value Decimal? — valor para aprovação
- ServiceOrder.scheduledDate DateTime? — data de execução
- ServiceOrder.photos String[] — URLs de fotos opcionais
- slaDeadline calculado com priority do Ticket pai

Migration aplicada: add_ticket_model

API corrigida:
- calculateSlaDeadline usa ticket.priority
- POST de OS recebe ticketId obrigatório
- Validations atualizadas para Zod v4

Próximo passo: UI de Tickets e formulário de OS vinculada ao Ticket

### [Refatoração] User → múltiplas unidades
Motivo: RECEPTIONIST pode ser responsável por mais de uma unidade.

ANTES: User.unitId String? (1 unidade por usuário)
DEPOIS: tabela pivot UserUnit (N unidades por usuário)

Impacto:
- Schema: nova tabela UserUnit, remover unitId do User
- Seed: atualizar para usar UserUnit
- proxy.ts: verificar array de unidades
- API routes: filtrar por unidades do usuário
- NextAuth: session.user.unitIds string[] em vez de unitId string
- Header: seletor mostra unidades do usuário (RECEPTIONIST)

### [Refatoração] Múltiplas unidades por usuário
Migration: refactor_user_multi_unit
Tabela pivot: UserUnit (userId + unitId, @@unique)

session.user.unitIds string[] (era unitId string)
RECEPTIONIST filtra por { unitId: { in: unitIds } }
ADMIN sem filtro de unidade por padrão

Seed atualizado:
- recepcao → Coworking
- membro → Coworking  
- ops.prudential → Prudential CG + Prudential Dourados
- admin → sem unidade fixa

Arquivos atualizados:
- auth.ts, proxy.ts
- 4 API routes, 5 páginas, ServiceOrderActions

### [Bug] proxy.ts — Edge Runtime bloqueando sessão
O proxy.ts precisa ter `export const runtime = "nodejs"` no topo.
Sem isso o NextAuth com Prisma/bcrypt falha silenciosamente 
no Edge Runtime — sessão retorna null — causando redirects errados.
Sintoma: clicar em cards redirecionava para área errada.
Solução: export const runtime = "nodejs" no início do proxy.ts.

### [Bug] ServiceOrderActions — ADMIN bloqueado por unidade
ADMIN tem unitIds = [] (sem unidades vinculadas).
A verificação !userUnitIds.includes(unitId) bloqueava o ADMIN
de aprovar/rejeitar OS de qualquer unidade.
Solução: verificar unidade apenas para RECEPTIONIST, nunca para ADMIN.

### [Bug] ServiceOrderActions — ADMIN bloqueado por unidade
ADMIN tem unitIds = [] — a verificação !userUnitIds.includes(unitId)
bloqueava ADMIN de aprovar OS de qualquer unidade.
Solução: verificar unidade apenas para RECEPTIONIST.
if (role === "MEMBER") return null;
if (role === "RECEPTIONIST" && !userUnitIds.includes(unitId)) return null;

### [Fase 4] Módulo de usuários completo
Arquivos criados:
- src/app/api/users/route.ts — GET + POST
- src/app/api/users/[id]/route.ts — GET + PUT + DELETE (desativa)
- src/app/(dashboard)/dashboard/admin/users/page.tsx
- src/app/(dashboard)/dashboard/admin/users/new/page.tsx
- src/app/(dashboard)/dashboard/admin/users/[id]/page.tsx
- src/components/shared/UserForm.tsx — modo criação e edição
- src/components/shared/UserDeactivateButton.tsx
Campo active Boolean @default(true) adicionado ao User.
Migration: refactor_user_multi_unit_and_active

### [Fase 4] TicketActions — fechar e iniciar tickets
src/components/shared/TicketActions.tsx criado.
ADMIN pode mover ticket: OPEN → IN_PROGRESS → CLOSED.
Adicionado no cabeçalho de tickets/[id]/page.tsx.

### [Fase 5] Espaços e Prestadores completo
Arquivos criados:
- src/app/api/spaces/route.ts — GET + POST
- src/app/api/spaces/[id]/route.ts — GET + PUT
- src/app/api/providers/route.ts — GET + POST
- src/app/api/providers/[id]/route.ts — GET + PUT
- src/components/shared/SpaceCard.tsx
- src/components/shared/SpaceForm.tsx — tipo bloqueado na edição
- src/components/shared/ProviderCard.tsx
- src/components/shared/ProviderForm.tsx — suporte a fixedUnitId para reception
- src/app/(dashboard)/dashboard/admin/spaces/page.tsx — filtros por tipo e status
- src/app/(dashboard)/dashboard/admin/spaces/new/page.tsx
- src/app/(dashboard)/dashboard/admin/spaces/[id]/page.tsx
- src/app/(dashboard)/dashboard/admin/providers/page.tsx — filtros por tipo e unidade
- src/app/(dashboard)/dashboard/admin/providers/new/page.tsx
- src/app/(dashboard)/dashboard/admin/providers/[id]/page.tsx
- src/app/(dashboard)/dashboard/reception/providers/page.tsx — filtro automático por unidade
- src/app/(dashboard)/dashboard/reception/providers/new/page.tsx
- src/app/(dashboard)/dashboard/reception/providers/[id]/page.tsx

Regras de acesso:
- Space GET: ADMIN + RECEPTIONIST. POST/PUT: só ADMIN
- Provider GET/POST/PUT: ADMIN + RECEPTIONIST (restrito à sua unidade)
- Espaços só existem em unidades COWORKING — API valida isso no POST

Sidebar simplificado: "Recorrentes" e "Pontuais" unificados em "Prestadores"
com link único para /dashboard/admin/providers e /dashboard/reception/providers.

### [Fase 6] Reservas completo
Arquivos criados:
- src/app/api/bookings/route.ts — GET + POST com validação completa
- src/app/api/bookings/[id]/route.ts — GET + DELETE (cancelamento)
- src/components/shared/BookingCard.tsx
- src/components/shared/BookingForm.tsx — date + time inputs nativos (step 30min)
- src/components/shared/CancelBookingButton.tsx — confirmação em dois passos
- src/app/(dashboard)/dashboard/member/bookings/page.tsx — próximas + histórico
- src/app/(dashboard)/dashboard/member/bookings/new/page.tsx — só espaços ACTIVE do COWORKING
- src/app/(dashboard)/dashboard/admin/bookings/page.tsx — todas as reservas com filtros

Regras implementadas:
- Validação de conflito em transação atômica (BookingError lançado dentro do $transaction)
- Espaço MAINTENANCE ou INACTIVE bloqueia nova reserva (409)
- Horário 7h–22h (OUT_OF_HOURS)
- Duração mínima 30 minutos (TOO_SHORT)
- Reserva no passado bloqueada (PAST_DATE)
- Cancelamento até CANCEL_HOURS_BEFORE horas antes (padrão 2h via env)
- MEMBER só vê e cancela as próprias reservas

### [Fase 6 — Revisão] Reservas exigem aprovação da recepção
Fluxo revisado após decisão de negócio:
- MEMBER cria reserva → status PENDING_APPROVAL
- RECEPTIONIST/ADMIN aprova → CONFIRMED (verifica conflito neste momento)
- RECEPTIONIST/ADMIN rejeita → REJECTED
- RECEPTIONIST/ADMIN cria diretamente → CONFIRMED (com verificação de conflito imediata)
- MEMBER pode cancelar PENDING_APPROVAL ou CONFIRMED (regra das 2h para CONFIRMED)

BookingStatus enum atualizado:
  PENDING_APPROVAL → CONFIRMED → (via aprovação)
  PENDING_APPROVAL → REJECTED  → (via rejeição)
  qualquer → CANCELLED         → (via cancelamento)

Verificação de conflito ocorre na APROVAÇÃO (não na criação pelo MEMBER).
Isso permite múltiplos pending no mesmo slot — conflito é resolvido na aprovação.

Migration: add_booking_approval_flow
Novos campos no Booking: approvedById String?, approvedAt DateTime?
Nova página: /dashboard/reception/bookings — fila de pendentes com ações
Sidebar da recepção: adicionado link "Reservas"
Novo componente: BookingActions (aprovar/rejeitar para recepção/admin)

### [Fix] proxy.ts — export const runtime removido
Next.js 16.2.1 não permite export const runtime em proxy.ts.
O proxy já roda em Node.js automaticamente — a linha causava erro de build.
Removida a linha: export const runtime = "nodejs"
Nota: a decisão anterior de adicionar essa linha foi para Next.js < 16.2.
A partir do 16.2.1, não é mais necessária nem permitida.

### [Fix] z.coerce.number() incompatível com react-hook-form + Zod v4
z.coerce.number() em Zod v4 infere o tipo de input como unknown,
causando conflito com o Resolver do react-hook-form.
Solução: usar z.number() no schema + { valueAsNumber: true } no register().
Aplicado em SpaceForm.tsx e TicketServiceOrderForm.tsx.

### [Fix] UserForm.tsx — z.array().default([]) incompatível com react-hook-form
z.array(z.string()).default([]) cria discrepância entre tipo de input (string[] | undefined)
e tipo de output (string[]) — causa erro no Resolver.
Solução: remover .default([]) do schema, usar defaultValues no useForm.

### [Fix] auth.ts — augmentação next-auth/jwt não encontrada
declare module "next-auth/jwt" falha no NextAuth v5 beta — módulo não encontrado.
Solução: remover o bloco, adicionar type assertions no callback session:
  session.user.id      = token.id      as string;
  session.user.role    = token.role    as Role;
  session.user.unitIds = token.unitIds as string[];

### [Fix] tsconfig.json — globals do Vitest não reconhecidos pelo TypeScript
O tsc não reconhecia describe/test/expect dos testes porque faltava a referência.
Solução: adicionar "types": ["vitest/globals"] no compilerOptions do tsconfig.json.
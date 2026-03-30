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
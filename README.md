# Coworkingfy

Sistema SaaS de gestão operacional de coworking. Gerencia reservas de espaços, ordens de serviço, tickets de manutenção e prestadores em múltiplas unidades.

## Stack

- **Framework:** Next.js 16 (App Router)
- **Banco de dados:** PostgreSQL via Supabase
- **ORM:** Prisma 7 com `@prisma/adapter-pg`
- **Autenticação:** NextAuth.js v5 (JWT)
- **UI:** Tailwind CSS + shadcn/ui
- **Testes:** Vitest + Testing Library
- **Deploy:** Vercel

## Setup local

### Pré-requisitos

- Node.js 22+
- Conta no [Supabase](https://supabase.com) com projeto criado

### 1. Clonar e instalar

```bash
git clone https://github.com/LuizMRBsantos/coworkingfy.git
cd coworkingfy
npm ci
```

### 2. Variáveis de ambiente

```bash
cp .env.example .env
```

Preencha o `.env` com seus valores:

| Variável | Descrição |
|---|---|
| `DATABASE_URL` | String de conexão PostgreSQL (use o Session Pooler do Supabase, porta 5432) |
| `AUTH_SECRET` | Segredo JWT — gere com `openssl rand -base64 32` |
| `AUTH_URL` | URL base da aplicação (ex: `http://localhost:3000`) |
| `AUTH_TRUST_HOST` | Defina como `true` em produção fora da Vercel |
| `CANCEL_HOURS_BEFORE` | Horas mínimas para cancelar uma reserva (padrão: `2`) |

> **Supabase:** use o **Session Pooler** (não a Direct Connection) — o host termina em `.pooler.supabase.com:5432`.
> A senha do banco não deve conter caracteres especiais (`@`, `#`, `$`) para evitar erros de URL encoding.

### 3. Banco de dados

```bash
# Aplicar schema
npx prisma migrate dev

# Gerar o client
npx prisma generate

# Popular com dados de demonstração
npx prisma db seed
```

### 4. Rodar localmente

```bash
npm run dev
```

Acesse `http://localhost:3000`.

## Credenciais de demonstração

| Usuário | Email | Senha | Role |
|---|---|---|---|
| Admin | admin@coworkingfy.com | admin123 | ADMIN |
| Recepção Coworking | recepcao@coworkingfy.com | recep123 | RECEPTIONIST |
| Ops Prudential | ops.prudential@coworkingfy.com | ops123 | RECEPTIONIST |
| Membro | membro@coworkingfy.com | membro123 | MEMBER |

## Comandos úteis

```bash
npm run dev              # servidor local
npm test                 # rodar testes
npm run test:watch       # testes em modo watch
npm run test:coverage    # cobertura de testes
npm run lint             # linting
npm run build            # build de produção

npx prisma migrate dev   # nova migration
npx prisma studio        # visualizar banco no browser
npx prisma db seed       # popular banco
npx prisma generate      # regenerar client após schema
```

## Deploy na Vercel

### 1. Conectar repositório

No painel da Vercel, importe o repositório GitHub e selecione o framework **Next.js**.

### 2. Variáveis de ambiente

Configure no painel **Settings → Environment Variables**:

```
DATABASE_URL=postgresql://...
AUTH_SECRET=...
AUTH_URL=https://seu-dominio.vercel.app
AUTH_TRUST_HOST=true
CANCEL_HOURS_BEFORE=2
```

### 3. Deploy

O deploy é automático a cada push para `main`. O `vercel.json` já está configurado com:
- Build command: `npx prisma generate && npm run build`
- Região: São Paulo (`gru1`)

## Arquitetura

```
src/
├── app/
│   ├── api/              # Route Handlers (REST API)
│   │   ├── auth/         # NextAuth handlers
│   │   ├── bookings/     # Reservas
│   │   ├── providers/    # Prestadores
│   │   ├── service-orders/ # Ordens de serviço
│   │   ├── spaces/       # Espaços
│   │   ├── tickets/      # Tickets
│   │   └── users/        # Usuários
│   └── (dashboard)/      # Páginas do dashboard
├── components/
│   ├── shared/           # Componentes reutilizáveis
│   └── ui/               # shadcn/ui
├── lib/
│   ├── auth.ts           # Configuração NextAuth
│   ├── db.ts             # Singleton Prisma
│   └── rate-limit.ts     # Rate limiting em memória
└── tests/
    └── api/              # Testes Vitest por endpoint
```

### Perfis de usuário (RBAC)

| Role | Acesso |
|---|---|
| `ADMIN` | Acesso total a todas as unidades |
| `RECEPTIONIST` | Reservas, OS, tickets e prestadores das suas unidades |
| `MEMBER` | Cliente do coworking — só faz agendamentos de espaços |

### Paginação

Endpoints de listagem aceitam `page` e `limit` como query params e retornam:

```json
{
  "data": [...],
  "meta": { "total": 42, "page": 1, "limit": 20, "totalPages": 3 }
}
```

Endpoints com paginação: `GET /api/tickets`, `GET /api/bookings`, `GET /api/service-orders`.

## CI

O pipeline GitHub Actions (`.github/workflows/ci.yml`) roda em todo push/PR para `main` e `dev`:

1. Lint (`npm run lint`)
2. Testes com cobertura (`npm run test:coverage`)
3. Build de produção (`npm run build`)

Thresholds de cobertura: 60% lines, 60% functions, 50% branches.

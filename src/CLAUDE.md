# Código fonte — regras

## Componentes Next.js
- Server Components por padrão
- Client Components só com 'use client' explícito
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
- Sempre usar o singleton de src/lib/db.ts
- Nunca instanciar PrismaClient diretamente nos componentes
- Prisma 7 requer @prisma/adapter-pg — já configurado no db.ts

## API Routes
- Verificar sessão primeiro → 401 se ausente
- Verificar role segundo → 403 se insuficiente
- Validar body com Zod antes de tocar no banco
- Shape de erro consistente: { error: string, code?: string }

## NextAuth v5
- Server Components → auth() de @/lib/auth
- Client Components → signIn/signOut de next-auth/react
- Middleware → auth() do NextAuth para verificar sessão
- Variável de ambiente: AUTH_SECRET (não NEXTAUTH_SECRET)

## Estrutura de rotas
- /dashboard/admin/*      → só ADMIN
- /dashboard/reception/*  → ADMIN + RECEPTIONIST  
- /dashboard/member/*     → todos os roles autenticados
- Redirecionamento por role feito no middleware
# Páginas do dashboard — regras

## Estrutura de página
- Server Component por padrão
- Sempre verificar sessão com auth()
- Nunca confiar em searchParams para controle de acesso
- unitFilter sempre baseado no role da sessão

## Padrão de busca de dados
- Buscar dados diretamente com Prisma (não via fetch)
- Usar Promise.all para queries paralelas
- Incluir só os campos necessários (select explícito)

## Rotas por role
- /dashboard/admin/*      → ADMIN
- /dashboard/reception/*  → ADMIN + RECEPTIONIST
- /dashboard/member/*     → todos autenticados

## searchParams no Next.js 16
- Sempre tipar como Promise<{...}>
- Sempre fazer await antes de usar

## Estado vazio
- Sempre mostrar mensagem clara quando não há dados
- Nunca deixar página em branco sem feedback
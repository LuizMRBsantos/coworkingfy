# IDEA.md — Coworkingfy

## O problema

O coworking gerencia reservas, equipe e manutenção de forma manual:
- Reservas chegam pelo WhatsApp sem controle centralizado
- Conflitos de horário são descobertos na hora
- Tickets de manutenção se perdem em conversas de grupo
- Nenhum dado operacional consolidado para decisões

## A solução

Aplicação web com três níveis de acesso que centraliza a operação:
- Admin controla tudo
- Recepcionista opera o dia a dia
- Membro faz e acompanha suas próprias reservas

## Perfis de usuário

| Perfil | Acesso |
|---|---|
| ADMIN | Tudo — espaços, reservas, equipe, manutenção, configurações |
| RECEPTIONIST | Reservas (todas), tickets (todos), visualizar equipe |
| MEMBER | Próprias reservas, abrir tickets, ver disponibilidade |

## Espaços físicos

Tipos:
- MEETING_ROOM — sala de reunião (com capacidade e recursos)
- WORKSTATION — estação de trabalho fixa
- COMMON_AREA — área comum reservável

Campos: nome, tipo, capacidade, descrição, status, createdAt.

Status possíveis:
- ACTIVE — disponível para reservas
- MAINTENANCE — bloqueado, não aceita reservas
- INACTIVE — desativado

## Reservas

Regras de negócio:
- Validação de conflito obrigatória e atômica (mesma transação)
- Espaço em MAINTENANCE não aceita nova reserva
- Cancelamento permitido até 2 horas antes
- Duração mínima: 30 minutos
- Horário de funcionamento: 7h–22h

Status possíveis:
- CONFIRMED — reserva ativa
- CANCELLED — cancelada pelo membro ou admin

Fluxo do membro:
1. Visualiza disponibilidade por espaço
2. Seleciona espaço, data, hora início e fim
3. Sistema valida conflito automaticamente
4. Confirma reserva

## Tickets de manutenção

Fluxo: OPEN → IN_PROGRESS → DONE / CANCELLED

Prioridades:
- LOW — sem urgência
- MEDIUM — padrão
- HIGH — bloqueia espaço automaticamente
- URGENT — bloqueia espaço automaticamente

Regras críticas:
- Ticket HIGH ou URGENT: muda Space.status para MAINTENANCE na mesma transação
- Ticket fechado (DONE): volta Space.status para ACTIVE na mesma transação

Campos: espaço afetado, título, descrição, prioridade, status, reporter, createdAt, updatedAt.

## Dashboard operacional

Para Admin:
- Ocupação do dia (espaços reservados agora)
- Tickets abertos por prioridade
- Reservas da semana por espaço
- Taxa de ocupação dos últimos 30 dias

Para Membro:
- Minhas reservas futuras
- Histórico de reservas passadas
- Botão rápido nova reserva

## O que este sistema NÃO faz

- Pagamentos, faturamento ou controle financeiro
- Controle de acesso físico (catracas, fechaduras)
- CRM ou gestão de contratos
- App mobile nativo
- Gestão de mensalidades ou planos

## Stack

- Next.js 14 App Router + TypeScript
- Tailwind CSS + shadcn/ui
- Prisma ORM + PostgreSQL (Supabase)
- NextAuth.js v5
- Zod para validação
- Vitest + Testing Library para testes
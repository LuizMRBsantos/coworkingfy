# IDEA.md — Coworkingfy

## O negócio

Dois modelos de operação gerenciados no mesmo sistema:

**Coworking próprio:**
- 22 salas privativas
- 40 estações de trabalho
- 3 salas de reunião
- Funcionalidades: reservas de espaços + OS com prestadores

**Escritórios BTS (Built-to-Suit) administrados:**
- Prudential Campina Grande
- Prudential Dourados
- Prudential Ipatinga
- Stefanini Campina Grande
- Funcionalidades: apenas OS com prestadores e SLA

## Unidades do sistema

| Nome | Tipo | Módulos ativos |
|---|---|---|
| Coworking | COWORKING | Reservas + OS |
| Prudential Campina Grande | BTS | Só OS |
| Prudential Dourados | BTS | Só OS |
| Prudential Ipatinga | BTS | Só OS |
| Stefanini Campina Grande | BTS | Só OS |

## Perfis de usuário

| Perfil | Acesso |
|---|---|
| ADMIN | Todas as unidades — reservas, OS, prestadores, relatórios |
| RECEPTIONIST | Só sua unidade — cria OS, atualiza status, cadastra prestadores |
| MEMBER | Só coworking — faz reservas, acompanha suas reservas |

## Espaços físicos (só coworking)

Tipos:
- MEETING_ROOM — sala de reunião (3 unidades)
- PRIVATE_OFFICE — sala privativa (22 unidades)
- WORKSTATION — estação de trabalho (40 unidades)

Campos: nome, tipo, capacidade, descrição, status, unidade.

Status:
- ACTIVE — disponível para reservas
- MAINTENANCE — bloqueado
- INACTIVE — desativado

## Reservas (só coworking)

Regras:
- Validação de conflito obrigatória e atômica
- Espaço em MAINTENANCE não aceita reserva
- Cancelamento permitido até 2h antes
- Duração mínima: 30 minutos
- Horário: 7h–22h

Status: CONFIRMED, CANCELLED

## Ordens de Serviço — OS (todas as unidades)

Criada pela RECEPTIONIST vinculada a um Ticket.
Representa a execução de um serviço específico.

Fluxo de aprovação:
DRAFT → PENDING_APPROVAL → APPROVED → IN_PROGRESS → DONE
ou REJECTED / CANCELLED

Quem faz o quê:
- RECEPTIONIST → cria OS, atualiza para IN_PROGRESS
- ADMIN → aprova, rejeita, fecha como DONE

Campos:
- Número sequencial: OS-2026-0001
- ticketId → ticket pai (obrigatório)
- Unidade (herdada do ticket)
- Espaço afetado (opcional, só coworking)
- Tipo de serviço: CLEANING, ELECTRICAL, HYDRAULIC, OTHER
- Descrição
- Prestador vinculado (opcional no DRAFT)
- Prioridade: LOW, MEDIUM, HIGH, URGENT
- Data agendada (scheduledDate)
- Valor estimado (para aprovação do gestor)
- Fotos opcionais (URLs)
- Status com aprovação
- approvedById + approvedAt
- slaDeadline (calculado na aprovação)
- createdAt, updatedAt

## Tickets / SLA (todas as unidades)

Criado pelo ADMIN a partir de chamados do sistema do cliente.
1 Ticket pode ter várias OS vinculadas.

Campos:
- Número sequencial interno: TK-2026-0001
- Número do chamado externo (ex: TICK-2026-0847)
- Unidade vinculada
- Descrição do problema
- Status: OPEN → IN_PROGRESS → CLOSED
- createdAt, updatedAt

Quem faz o quê:
- ADMIN → cria ticket, fecha ticket
- RECEPTIONIST → visualiza tickets da sua unidade, cria OS filhas
- MEMBER → sem acesso a tickets

## SLA por prioridade

| Prioridade | Prazo de aprovação | Prazo de execução |
|---|---|---|
| URGENT | 2 horas | 24 horas |
| HIGH | 4 horas | 48 horas |
| MEDIUM | 24 horas | 5 dias |
| LOW | 48 horas | 15 dias |

OS com SLA vencido aparece destacada no painel do Admin.

## Prestadores (todas as unidades)

Tipos:
- RECURRING — prestador fixo da unidade
- PUNCTUAL — prestador avulso por OS

Campos: nome, especialidade, telefone, email,
tipo, unidade vinculada, status (ACTIVE/INACTIVE), createdAt.

Especialidades: CLEANING, ELECTRICAL, HYDRAULIC, OTHER

## Dashboard

**Admin (visão geral ou por unidade):**
- Filtro: Hoje / Esta semana / Este mês / 30 dias
- Cards: OS abertas, OS em progresso, SLA crítico, OS concluídas
- Gráfico: volume por dia
- Lista: OS com SLA vencido em destaque

**Receptionist (só sua unidade):**
- OS da sua unidade por status
- Prestadores ativos da unidade
- Botão rápido: Nova OS

**Member (só coworking):**
- Minhas reservas futuras
- Histórico de reservas
- Botão rápido: Nova reserva

## O que este sistema NÃO faz

- Pagamentos, faturamento ou financeiro de qualquer tipo
- Controle de acesso físico
- CRM ou contratos
- App mobile nativo
- Gestão de mensalidades
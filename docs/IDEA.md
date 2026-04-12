# IDEA.md — Coworkingfy
> Documento de referência de negócio — atualizado em 2026-04-08

---

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

---

## Unidades do sistema

| Nome | Tipo | Módulos ativos |
|---|---|---|
| Coworking | COWORKING | Reservas + OS + Ativos + PMOC + Saúde |
| Prudential Campina Grande | BTS | OS + Ativos + PMOC + Saúde |
| Prudential Dourados | BTS | OS + Ativos + PMOC + Saúde |
| Prudential Ipatinga | BTS | OS + Ativos + PMOC + Saúde |
| Stefanini Campina Grande | BTS | OS + Ativos + PMOC + Saúde |

Cada unidade pode ter campos extras: `address`, `clientName`, `clientContact`.

---

## Perfis de usuário

| Perfil | Acesso |
|---|---|
| ADMIN | Todas as unidades — visão completa, aprovações, relatórios |
| RECEPTIONIST | Suas unidades — cria e atualiza OS, cadastra prestadores |
| MEMBER | Só coworking — faz reservas, acompanha suas reservas |

Um RECEPTIONIST pode ser responsável por mais de uma unidade (tabela pivot `UserUnit`).
ADMIN não precisa de unidade fixa — vê tudo.

---

## Espaços físicos (só coworking)

Tipos: `MEETING_ROOM`, `PRIVATE_OFFICE`, `WORKSTATION`

Status: `ACTIVE`, `MAINTENANCE`, `INACTIVE`

Campos: nome, tipo, capacidade, descrição, status, unidade.

---

## Reservas (só coworking)

Fluxo de status:
```
MEMBER cria → PENDING_APPROVAL
RECEPTIONIST/ADMIN aprova → CONFIRMED   (verifica conflito neste momento)
RECEPTIONIST/ADMIN rejeita → REJECTED
MEMBER/RECEPTIONIST/ADMIN cancela → CANCELLED
RECEPTIONIST/ADMIN cria diretamente → CONFIRMED (com verificação imediata)
```

Regras:
- Validação de conflito obrigatória e atômica — ocorre na **aprovação**, não na criação
- Espaço em MAINTENANCE ou INACTIVE não aceita reserva
- Cancelamento de CONFIRMED permitido até `CANCEL_HOURS_BEFORE` horas antes (padrão 2h)
- Duração mínima: 30 minutos
- Horário: 7h–22h

---

## Tickets / SLA (todas as unidades)

Criado pelo ADMIN a partir de chamados externos.
1 Ticket pode ter N Ordens de Serviço vinculadas.

Status: `OPEN → IN_PROGRESS → CLOSED`

Campos:
- Número sequencial: `TK-2026-0001`
- Número externo: ex. `TICK-2026-0847`
- Unidade vinculada
- Descrição do problema
- Prioridade: `LOW`, `MEDIUM`, `HIGH`, `URGENT`
- createdAt, updatedAt

Quem faz o quê:
- ADMIN → cria, move status, fecha
- RECEPTIONIST → visualiza, cria OS filhas
- MEMBER → sem acesso

---

## Ordens de Serviço — OS (todas as unidades)

OS pode ser criada de duas formas:
1. **Corretiva** — vinculada a um Ticket (`ticketId` preenchido)
2. **Preventiva** — gerada automaticamente pelo motor de manutenção (`maintenancePlanId` preenchido, `ticketId = null`)

### Fluxo de status
```
DRAFT → PENDING_APPROVAL → APPROVED → IN_PROGRESS → DONE → VALIDATED
                                     ↘ REJECTED
             (qualquer etapa antes de DONE) → CANCELLED (exige motivo)
```

- **startedAt** — setado automaticamente ao entrar em IN_PROGRESS
- **completedAt** — setado automaticamente ao entrar em DONE
- **cancelledAt** — setado automaticamente ao entrar em CANCELLED
- **validatedAt** — setado automaticamente ao entrar em VALIDATED

### Campos principais
| Campo | Descrição |
|---|---|
| number | Número sequencial: `OS-2026-0001` |
| ticketId | Ticket pai (null para OS preventiva) |
| unitId | Unidade (obrigatório) |
| spaceId | Espaço afetado (opcional — só coworking) |
| assetId | Ativo/equipamento relacionado (opcional) |
| maintenancePlanId | Plano que gerou a OS (opcional) |
| providerId | Prestador vinculado (opcional no DRAFT) |
| serviceType | CLEANING, ELECTRICAL, HYDRAULIC, OTHER |
| description | Descrição do serviço |
| isRemote | Resolução remota (boolean) |
| specialInstructions | Instruções especiais |
| executionReport | Relatório de execução |
| cancellationReason | Motivo (obrigatório em CANCELLED) |
| scheduledDate | Data agendada |
| value | Valor estimado (Decimal) |
| photos | URLs de fotos (array) |
| slaAttendanceDeadline | Prazo de atendimento em horas úteis |
| slaResolutionDeadline | Prazo de resolução em horas úteis |

### UI — 3 abas na tela de detalhe
- **Resumo** — dados gerais, indicadores de SLA, instruções especiais, documentos anexados
- **Execução** — fotos de comprovação, relatório, indicador de execução remota
- **Histórico** — ticket relacionado, linha do tempo de eventos, motivo de cancelamento

---

## SLA em Horas Úteis

Horário comercial: seg–sex 08h–18h.

Dois prazos calculados a partir da aprovação da OS:

| Prioridade | Atendimento (1ª ação / IN_PROGRESS) | Resolução (DONE ou VALIDATED) |
|---|---|---|
| URGENT | 2h úteis | 4h úteis |
| HIGH | 8h úteis | 24h úteis |
| MEDIUM | 36h úteis | 48h úteis |
| LOW | 72h úteis | 96h úteis |

- **SLA atendimento estourado** = OS em APPROVED sem `startedAt` e `slaAttendanceDeadline < agora`
- **SLA resolução estourado** = OS aberta com `slaResolutionDeadline < agora`

---

## Prestadores (todas as unidades)

Tipos: `RECURRING` (fixo da unidade), `PUNCTUAL` (avulso)

Status: `ACTIVE`, `INACTIVE`

Especialidades: `CLEANING`, `ELECTRICAL`, `HYDRAULIC`, `OTHER`

Campos: nome, especialidade, telefone, email, tipo, unidade, status.

RECEPTIONIST só cadastra/edita prestadores da sua própria unidade.

---

## Ativos e Equipamentos (todas as unidades)

Representa equipamentos físicos cadastrados por unidade (e opcionalmente por espaço).

Tipos (`AssetType`): `HVAC`, `FIRE_SAFETY`, `ELECTRICAL`, `PLUMBING`, `ELEVATOR`,
`APPLIANCE`, `IT_INFRA`, `FURNITURE`, `OTHER`
(+ legados: `AC`, `ELECTRONIC`, `HYDRAULIC`, `CLEANING`)

Status: `ACTIVE`, `INACTIVE`, `MAINTENANCE`, `UNDER_MAINTENANCE`, `DECOMMISSIONED`

Campos: código único (etiqueta física), nome, descrição, tipo, fabricante, modelo, nº de série, data de compra, validade da garantia, notas, status.

Cada ativo pode ser vinculado a OS — acumula histórico de manutenção corretiva e preventiva.

---

## Planos de Manutenção — PMOC (todas as unidades)

Representa o planejamento preventivo de cada unidade.

Frequências: `DAILY`, `WEEKLY`, `MONTHLY`, `QUARTERLY`, `SEMI_ANNUALLY`, `ANNUALLY`

Campos: unidade, ativo (opcional), espaço (opcional), nome, descrição, frequência, tipo de serviço, prioridade, `lastRunAt`, `nextRunAt`, `isActive`.

Ao criar uma nova unidade, o sistema gera automaticamente 9 planos base:

| Nome | Frequência |
|---|---|
| Limpeza diária | DAILY |
| Limpeza de filtros de AC | MONTHLY |
| Manutenção completa de AC | QUARTERLY |
| Reposição insumos de limpeza | MONTHLY |
| Reposição insumos de cozinha | MONTHLY |
| Reposição insumos de escritório | MONTHLY |
| Vistoria de extintores | ANNUALLY |
| Limpeza de caixa d'água | SEMI_ANNUALLY |
| Dedetização | QUARTERLY |

### Motor preventivo (Cron)
- Rota: `GET /api/cron/maintenance` — autenticada via header `Authorization: Bearer CRON_SECRET`
- Frequência sugerida: diária às 06h UTC (03h Brasília)
- Lógica: para cada plano ativo com `nextRunAt <= amanhã`, verifica se já existe OS ativa → se não, cria OS em DRAFT → atualiza `nextRunAt` conforme a frequência

---

## Compras de Insumos (todas as unidades)

Registro de gastos com insumos por unidade.

Categorias: `CLEANING` (Limpeza), `COFFEE` (Café), `OFFICE_SUPPLIES` (Material de escritório)

Campos: unidade, categoria, descrição, valor, data da compra, quem registrou, notas.

Exibido na tela de detalhe de cada unidade com totais por categoria e lista das últimas compras.

---

## Dashboard de Saúde das Unidades (`/overview`)

Score 0–100 por unidade, calculado em tempo real.

**Deduções:**
- Ticket URGENT aberto: −30 pts cada
- Ticket HIGH aberto: −15 pts cada
- OS com SLA resolução vencido: −30/−15/−5 pts (proporcional à prioridade estimada)
- OS com SLA atendimento vencido: −10 pts cada
- OS sem SLA aberta há +7 dias: −5 pts cada
- Plano PMOC vencido: −10 pts cada
- Plano PMOC vencendo em 7 dias: −2 pts cada

**Bônus:**
- +2 pts por OS preventiva VALIDATED no mês atual (máx +10)

**Faixas:**
- 🟢 ≥ 80 — tudo em dia
- 🟡 50–79 — atenção necessária
- 🔴 < 50 — intervenção imediata
- ⚫ sem dados — não gerenciada (score retorna 100 mas banda = "none")

A tela `/overview` exibe um grid com todas as unidades simultaneamente.
Clicar em uma unidade abre o detalhe completo (`/overview/[id]`) com: tickets, OS ativas, PMOC, equipamentos, custos (OS + insumos) e prestadores.

---

## Relatórios (`/dashboard/admin/reports`)

- Contadores: OS abertas, em progresso, SLA crítico, concluídas
- Gráfico de barras: OS criadas por dia (últimos 30 dias)
- Gráfico de pizza: Tickets por prioridade
- Gráfico de barras: Reservas por dia (últimos 30 dias)
- Export CSV: OS e Tickets (com BOM UTF-8 para compatibilidade com Excel)

---

## Dashboards por perfil

**Admin (`/dashboard/admin`):**
- Filtro de período: Hoje / Esta semana / Este mês / 30 dias
- Cards: OS abertas, em progresso, SLA crítico, concluídas
- Gráfico de volume diário
- Lista de OS com SLA crítico em destaque

**Receptionist (`/dashboard/reception`):**
- OS da sua unidade por status
- Prestadores ativos
- Botão rápido: Nova OS

**Member (`/dashboard/member`):**
- Próximas reservas
- Histórico de reservas
- Botão rápido: Nova reserva

---

## O que este sistema NÃO faz

- Pagamentos, faturamento ou financeiro de qualquer tipo
- Controle de acesso físico
- CRM ou contratos
- App mobile nativo
- Gestão de mensalidades

## Funcionalidades planejadas (não implementadas)

- QR Codes por ativo/espaço
- Portal do prestador (acesso externo via token)
- E-mails automáticos (Resend) — alertas SLA, digest preventivo
- Relatórios PDF com identidade visual Coworkingfy
- Checklists obrigatórios para fechar OS
- Dashboard de saúde com histórico de score por período

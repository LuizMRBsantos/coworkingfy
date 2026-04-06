# Componentes — regras

## Organização
- src/components/ui/       → componentes shadcn (nunca editar diretamente)
- src/components/shared/   → componentes reutilizáveis do projeto

## Quando usar Client Component
- Eventos DOM (onClick, onChange)
- useState ou useEffect
- useRouter, usePathname
- Sempre adicionar comentário explicando o motivo

## Padrões de componente
- Props tipadas com interface explícita — nunca usar any
- Nomes em PascalCase
- Um componente por arquivo
- Exportação nomeada (não default export)

## Estilização
- Tailwind CSS para tudo
- shadcn/ui para componentes de interface
- Variantes com Record<Enum, string> para badges e cores
- Nunca hardcodar cores — usar classes Tailwind

## Componentes existentes
- ServiceOrderCard        → card de OS com badges e SLA
- ServiceOrderFilters     → filtros de status e unidade
- ServiceOrderActions     → transições de estado da OS (ADMIN/RECEPTIONIST)
- TicketCard              → card de ticket com badge de status e contagem de OS
- TicketForm              → formulário de criação/edição de ticket
- TicketFilters           → filtros de status e unidade
- TicketActions           → botões OPEN → IN_PROGRESS → CLOSED (ADMIN)
- TicketServiceOrderForm  → formulário de OS vinculada ao ticket
- SpaceCard               → card de espaço com tipo, status, capacidade e contadores
- SpaceForm               → criar/editar espaço (tipo bloqueado na edição)
- ProviderCard            → card de prestador com tipo, especialidade e contato
- ProviderForm            → criar/editar prestador (suporte a fixedUnitId para reception)
- BookingCard             → card de reserva com data, horário, espaço e ações
- BookingForm             → seletor de espaço + date + time inputs (step 30min)
- CancelBookingButton     → cancelamento com confirmação em dois passos
- UserForm                → criar/editar usuário com seletor de role e unidades
- UserDeactivateButton    → desativar usuário com confirmação
- Sidebar                 → navegação por role
- Header                  → seletor de unidade e avatar

## Padrão de formulário numérico
Nunca usar z.coerce.number() — causa inferência de tipo unknown no Zod v4.
Usar z.number() no schema + { valueAsNumber: true } no register():
  capacity: z.number().int().min(1)
  <Input type="number" {...register("capacity", { valueAsNumber: true })} />
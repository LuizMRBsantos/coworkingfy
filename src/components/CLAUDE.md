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
- ServiceOrderCard     → card de OS com badges e SLA
- ServiceOrderFilters  → filtros de status e unidade
- Sidebar              → navegação por role
- Header               → seletor de unidade e avatar
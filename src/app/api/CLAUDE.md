# API Routes — regras

## Estrutura obrigatória de toda rota
```typescript
import { auth } from "@/lib/auth"
import { NextResponse } from "next/server"
import { z } from "zod"
import { db } from "@/lib/db"

export async function GET(req: Request) {
  // 1. Verificar sessão
  const session = await auth()
  if (!session) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 })
  }

  // 2. Verificar role se necessário
  if (session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Sem permissão" }, { status: 403 })
  }

  // 3. Lógica
}
```

## Filtro por unidade

ADMIN pode ver todas as unidades ou filtrar por uma.
RECEPTIONIST vê só sua unitId.
```typescript
const unitFilter = session.user.role === "ADMIN"
  ? req.nextUrl.searchParams.get("unitId") ?? undefined
  : session.user.unitId ?? undefined
```

## Shape de erro consistente
```typescript
{ error: string, code?: string }
```

## Validação com Zod

Sempre validar body antes de tocar no banco:
```typescript
const body = await req.json()
const parsed = schema.safeParse(body)
if (!parsed.success) {
  return NextResponse.json(
    { error: "Dados inválidos", code: "VALIDATION_ERROR" },
    { status: 400 }
  )
}
```

## Status HTTP

- 200 → sucesso com dados
- 201 → criado com sucesso
- 400 → dados inválidos
- 401 → não autenticado
- 403 → sem permissão
- 404 → não encontrado
- 409 → conflito (ex: reserva duplicada)
- 500 → erro interno

## Regras de acesso por recurso

### ServiceOrder
- GET → ADMIN (todas) ou RECEPTIONIST (sua unidade)
- POST → RECEPTIONIST + ADMIN
- PUT status APPROVED/REJECTED → só ADMIN
- PUT status IN_PROGRESS/DONE → RECEPTIONIST + ADMIN

### Provider
- GET → ADMIN + RECEPTIONIST (sua unidade)
- POST/PUT → ADMIN + RECEPTIONIST (sua unidade)

### Space + Booking
- GET → todos autenticados
- POST Booking → MEMBER + RECEPTIONIST + ADMIN
- POST/PUT Space → só ADMIN
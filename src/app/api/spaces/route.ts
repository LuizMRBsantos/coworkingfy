import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { SpaceType, SpaceStatus } from "@prisma/client";
import { z } from "zod";

const CreateSpaceSchema = z.object({
  unitId:      z.string().min(1),
  name:        z.string().min(1, "Nome é obrigatório"),
  description: z.string().optional(),
  capacity:    z.number().int().min(1, "Capacidade deve ser ao menos 1"),
  type:        z.nativeEnum(SpaceType),
  status:      z.nativeEnum(SpaceStatus).optional(),
});

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const { role, unitIds } = session.user;
  if (role === "MEMBER") return NextResponse.json({ error: "Sem permissão" }, { status: 403 });

  const params = req.nextUrl.searchParams;
  const unitFilter  = role === "ADMIN" ? params.get("unitId") ?? undefined : undefined;
  const typeParam   = params.get("type") as SpaceType | null;
  const statusParam = params.get("status") as SpaceStatus | null;

  const spaces = await db.space.findMany({
    where: {
      ...(unitFilter
        ? { unitId: unitFilter }
        : role === "RECEPTIONIST"
        ? { unitId: { in: unitIds } }
        : {}),
      ...(typeParam   ? { type:   typeParam }   : {}),
      ...(statusParam ? { status: statusParam } : {}),
    },
    orderBy: [{ type: "asc" }, { name: "asc" }],
    include: {
      unit:    { select: { id: true, name: true } },
      _count:  { select: { bookings: true, serviceOrders: true } },
    },
  });

  return NextResponse.json(spaces);
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  if (session.user.role !== "ADMIN") return NextResponse.json({ error: "Sem permissão" }, { status: 403 });

  const body = await req.json();
  const parsed = CreateSpaceSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Dados inválidos", code: "VALIDATION_ERROR" }, { status: 400 });
  }

  const { unitId, name, description, capacity, type, status } = parsed.data;

  // Verificar se a unidade existe e é do tipo COWORKING
  const unit = await db.unit.findUnique({ where: { id: unitId } });
  if (!unit) return NextResponse.json({ error: "Unidade não encontrada" }, { status: 404 });
  if (unit.type !== "COWORKING") {
    return NextResponse.json({ error: "Espaços só podem ser criados em unidades Coworking", code: "INVALID_UNIT_TYPE" }, { status: 400 });
  }

  const space = await db.space.create({
    data: { unitId, name, description: description ?? null, capacity, type, status: status ?? "ACTIVE" },
    include: { unit: { select: { id: true, name: true } } },
  });

  return NextResponse.json(space, { status: 201 });
}

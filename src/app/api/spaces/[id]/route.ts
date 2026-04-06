import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { SpaceStatus } from "@prisma/client";
import { z } from "zod";

const UpdateSpaceSchema = z.object({
  name:        z.string().min(1).optional(),
  description: z.string().optional(),
  capacity:    z.number().int().min(1).optional(),
  status:      z.nativeEnum(SpaceStatus).optional(),
});

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(_req: Request, { params }: RouteParams) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const { id } = await params;

  const space = await db.space.findUnique({
    where: { id },
    include: {
      unit: { select: { id: true, name: true } },
      _count: { select: { bookings: true, serviceOrders: true } },
    },
  });

  if (!space) return NextResponse.json({ error: "Espaço não encontrado" }, { status: 404 });

  // RECEPTIONIST só acessa espaços da sua unidade
  if (session.user.role === "RECEPTIONIST" && !session.user.unitIds.includes(space.unitId)) {
    return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
  }

  return NextResponse.json(space);
}

export async function PUT(req: Request, { params }: RouteParams) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  if (session.user.role !== "ADMIN") return NextResponse.json({ error: "Sem permissão" }, { status: 403 });

  const { id } = await params;

  const body = await req.json();
  const parsed = UpdateSpaceSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Dados inválidos", code: "VALIDATION_ERROR" }, { status: 400 });
  }

  const existing = await db.space.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Espaço não encontrado" }, { status: 404 });

  const space = await db.space.update({
    where: { id },
    data: parsed.data,
    include: { unit: { select: { id: true, name: true } } },
  });

  return NextResponse.json(space);
}

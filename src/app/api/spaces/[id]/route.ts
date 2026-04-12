import { NextResponse } from "next/server";
import { z } from "zod";
import { SpaceStatus } from "@prisma/client";
import { db } from "@/lib/db";
import { withAuth } from "@/lib/rbac";

const UpdateSpaceSchema = z.object({
  name:        z.string().min(1).optional(),
  description: z.string().optional(),
  capacity:    z.number().int().min(1).optional(),
  status:      z.nativeEnum(SpaceStatus).optional(),
});

interface RouteContext {
  params: Promise<{ id: string }>;
}

export const GET = withAuth(async (_req, session, { params }: RouteContext) => {
  const { id } = await params;

  const space = await db.space.findUnique({
    where: { id },
    include: {
      unit:   { select: { id: true, name: true } },
      _count: { select: { bookings: true, serviceOrders: true } },
    },
  });

  if (!space) return NextResponse.json({ error: "Espaço não encontrado" }, { status: 404 });

  // RECEPTIONIST só acessa espaços da sua unidade
  if (session.user.role === "RECEPTIONIST" && !session.user.unitIds.includes(space.unitId)) {
    return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
  }

  return NextResponse.json(space);
});

export const PUT = withAuth(
  async (req, _session, { params }: RouteContext) => {
    const { id } = await params;

    const body   = await req.json();
    const parsed = UpdateSpaceSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Dados inválidos", code: "VALIDATION_ERROR" }, { status: 400 });
    }

    const existing = await db.space.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ error: "Espaço não encontrado" }, { status: 404 });

    const space = await db.space.update({
      where: { id },
      data:  parsed.data,
      include: { unit: { select: { id: true, name: true } } },
    });

    return NextResponse.json(space);
  },
  ["ADMIN"],
);

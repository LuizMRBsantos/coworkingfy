import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { withAuth } from "@/lib/rbac";
import { UpdateUnitSchema } from "@/lib/validations/unit";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export const GET = withAuth(
  async (_req, _session, context: RouteContext) => {
    const { id } = await context.params;

    const unit = await db.unit.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            spaces:        true,
            tickets:       true,
            serviceOrders: true,
            providers:     true,
          },
        },
        userUnits: {
          select: { user: { select: { id: true, name: true, role: true } } },
        },
      },
    });

    if (!unit) return NextResponse.json({ error: "Unidade não encontrada" }, { status: 404 });

    return NextResponse.json(unit);
  },
  ["ADMIN"],
);

export const PUT = withAuth(
  async (req, _session, context: RouteContext) => {
    const { id } = await context.params;

    const unit = await db.unit.findUnique({ where: { id } });
    if (!unit) return NextResponse.json({ error: "Unidade não encontrada" }, { status: 404 });

    const body   = await req.json();
    const parsed = UpdateUnitSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Dados inválidos", code: "VALIDATION_ERROR" }, { status: 400 });
    }

    const updated = await db.unit.update({
      where: { id },
      data:  {
        name:          parsed.data.name,
        address:       parsed.data.address ?? null,
        clientName:    parsed.data.clientName ?? null,
        clientContact: parsed.data.clientContact ?? null,
      },
    });

    return NextResponse.json(updated);
  },
  ["ADMIN"],
);

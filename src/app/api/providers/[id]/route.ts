import { NextResponse } from "next/server";
import { z } from "zod";
import { ServiceType, ProviderType, ProviderStatus } from "@prisma/client";
import { db } from "@/lib/db";
import { withAuth } from "@/lib/rbac";

const UpdateProviderSchema = z.object({
  name:      z.string().min(1).optional(),
  specialty: z.nativeEnum(ServiceType).optional(),
  type:      z.nativeEnum(ProviderType).optional(),
  phone:     z.string().optional(),
  email:     z.string().email().optional().or(z.literal("")),
  status:    z.nativeEnum(ProviderStatus).optional(),
});

interface RouteContext {
  params: Promise<{ id: string }>;
}

export const GET = withAuth(
  async (_req, session, { params }: RouteContext) => {
    const { role, unitIds } = session.user;
    const { id } = await params;

    const provider = await db.provider.findUnique({
      where: { id },
      include: {
        unit:   { select: { id: true, name: true } },
        _count: { select: { serviceOrders: true } },
      },
    });

    if (!provider) return NextResponse.json({ error: "Prestador não encontrado" }, { status: 404 });

    if (role === "RECEPTIONIST" && !unitIds.includes(provider.unitId)) {
      return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
    }

    return NextResponse.json(provider);
  },
  ["ADMIN", "RECEPTIONIST"],
);

export const PUT = withAuth(
  async (req, session, { params }: RouteContext) => {
    const { role, unitIds } = session.user;
    const { id } = await params;

    const body   = await req.json();
    const parsed = UpdateProviderSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Dados inválidos", code: "VALIDATION_ERROR" }, { status: 400 });
    }

    const existing = await db.provider.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ error: "Prestador não encontrado" }, { status: 404 });

    if (role === "RECEPTIONIST" && !unitIds.includes(existing.unitId)) {
      return NextResponse.json({ error: "Sem permissão para esta unidade" }, { status: 403 });
    }

    const data = {
      ...parsed.data,
      email: parsed.data.email === "" ? null : parsed.data.email,
    };

    const provider = await db.provider.update({
      where: { id },
      data,
      include: { unit: { select: { id: true, name: true } } },
    });

    return NextResponse.json(provider);
  },
  ["ADMIN", "RECEPTIONIST"],
);

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { ServiceType, ProviderType, ProviderStatus } from "@prisma/client";
import { z } from "zod";

const UpdateProviderSchema = z.object({
  name:      z.string().min(1).optional(),
  specialty: z.nativeEnum(ServiceType).optional(),
  type:      z.nativeEnum(ProviderType).optional(),
  phone:     z.string().optional(),
  email:     z.string().email().optional().or(z.literal("")),
  status:    z.nativeEnum(ProviderStatus).optional(),
});

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(_req: Request, { params }: RouteParams) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const { role, unitIds } = session.user;
  if (role === "MEMBER") return NextResponse.json({ error: "Sem permissão" }, { status: 403 });

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
}

export async function PUT(req: Request, { params }: RouteParams) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const { role, unitIds } = session.user;
  if (role === "MEMBER") return NextResponse.json({ error: "Sem permissão" }, { status: 403 });

  const { id } = await params;

  const body = await req.json();
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
}

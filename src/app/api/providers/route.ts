import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { ServiceType, ProviderType, ProviderStatus } from "@prisma/client";
import { z } from "zod";

const CreateProviderSchema = z.object({
  unitId:    z.string().min(1),
  name:      z.string().min(1, "Nome é obrigatório"),
  specialty: z.nativeEnum(ServiceType),
  type:      z.nativeEnum(ProviderType),
  phone:     z.string().optional(),
  email:     z.string().email("Email inválido").optional().or(z.literal("")),
});

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const { role, unitIds } = session.user;
  if (role === "MEMBER") return NextResponse.json({ error: "Sem permissão" }, { status: 403 });

  const params = req.nextUrl.searchParams;
  const unitFilter     = role === "ADMIN" ? params.get("unitId") ?? undefined : undefined;
  const typeParam      = params.get("type") as ProviderType | null;
  const specialtyParam = params.get("specialty") as ServiceType | null;
  const statusParam    = params.get("status") as ProviderStatus | null;

  const providers = await db.provider.findMany({
    where: {
      ...(unitFilter
        ? { unitId: unitFilter }
        : role === "RECEPTIONIST"
        ? { unitId: { in: unitIds } }
        : {}),
      ...(typeParam      ? { type:      typeParam }      : {}),
      ...(specialtyParam ? { specialty: specialtyParam } : {}),
      ...(statusParam    ? { status:    statusParam }    : {}),
    },
    orderBy: [{ name: "asc" }],
    include: {
      unit:   { select: { id: true, name: true } },
      _count: { select: { serviceOrders: true } },
    },
  });

  return NextResponse.json(providers);
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const { role, unitIds } = session.user;
  if (role === "MEMBER") return NextResponse.json({ error: "Sem permissão" }, { status: 403 });

  const body = await req.json();
  const parsed = CreateProviderSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Dados inválidos", code: "VALIDATION_ERROR" }, { status: 400 });
  }

  const { unitId, name, specialty, type, phone, email } = parsed.data;

  // RECEPTIONIST só cria prestadores na sua unidade
  if (role === "RECEPTIONIST" && !unitIds.includes(unitId)) {
    return NextResponse.json({ error: "Sem permissão para esta unidade" }, { status: 403 });
  }

  const provider = await db.provider.create({
    data: {
      unitId,
      name,
      specialty,
      type,
      phone: phone ?? null,
      email: email || null,
    },
    include: { unit: { select: { id: true, name: true } } },
  });

  return NextResponse.json(provider, { status: 201 });
}

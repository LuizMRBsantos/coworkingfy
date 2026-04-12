import { NextResponse } from "next/server";
import { z } from "zod";
import { ServiceType, ProviderType, ProviderStatus } from "@prisma/client";
import { db } from "@/lib/db";
import { withAuth } from "@/lib/rbac";
import { CreateProviderSchema } from "@/lib/validations/provider";

const TypeSchema      = z.nativeEnum(ProviderType).optional();
const SpecialtySchema = z.nativeEnum(ServiceType).optional();
const StatusSchema    = z.nativeEnum(ProviderStatus).optional();

export const GET = withAuth(
  async (req, session) => {
    const { role, unitIds } = session.user;
    const params = req.nextUrl.searchParams;

    const unitFilter = role === "ADMIN" ? params.get("unitId") ?? undefined : undefined;

    const typeParsed      = TypeSchema.safeParse(params.get("type") ?? undefined);
    const specialtyParsed = SpecialtySchema.safeParse(params.get("specialty") ?? undefined);
    const statusParsed    = StatusSchema.safeParse(params.get("status") ?? undefined);
    const typeParam       = typeParsed.success      ? typeParsed.data      : undefined;
    const specialtyParam  = specialtyParsed.success ? specialtyParsed.data : undefined;
    const statusParam     = statusParsed.success    ? statusParsed.data    : undefined;

    const page  = Math.max(1, parseInt(params.get("page")  ?? "1",  10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(params.get("limit") ?? "20", 10) || 20));
    const skip  = (page - 1) * limit;

    const where = {
      ...(unitFilter
        ? { unitId: unitFilter }
        : role === "RECEPTIONIST"
        ? { unitId: { in: unitIds } }
        : {}),
      ...(typeParam      ? { type:      typeParam }      : {}),
      ...(specialtyParam ? { specialty: specialtyParam } : {}),
      ...(statusParam    ? { status:    statusParam }    : {}),
    };

    const [providers, total] = await Promise.all([
      db.provider.findMany({
        where,
        orderBy: [{ name: "asc" }],
        skip,
        take: limit,
        include: {
          unit:   { select: { id: true, name: true } },
          _count: { select: { serviceOrders: true } },
        },
      }),
      db.provider.count({ where }),
    ]);

    return NextResponse.json({ data: providers, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } });
  },
  ["ADMIN", "RECEPTIONIST"],
);

export const POST = withAuth(
  async (req, session) => {
    const { role, unitIds } = session.user;

    const body   = await req.json();
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
  },
  ["ADMIN", "RECEPTIONIST"],
);

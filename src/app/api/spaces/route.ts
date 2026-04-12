import { NextResponse } from "next/server";
import { z } from "zod";
import { SpaceType, SpaceStatus } from "@prisma/client";
import { db } from "@/lib/db";
import { withAuth } from "@/lib/rbac";
import { CreateSpaceSchema } from "@/lib/validations/space";

const TypeSchema   = z.nativeEnum(SpaceType).optional();
const StatusSchema = z.nativeEnum(SpaceStatus).optional();

export const GET = withAuth(
  async (req, session) => {
    const { role, unitIds } = session.user;
    const params = req.nextUrl.searchParams;

    const unitFilter = role === "ADMIN" ? params.get("unitId") ?? undefined : undefined;

    const typeParsed   = TypeSchema.safeParse(params.get("type") ?? undefined);
    const statusParsed = StatusSchema.safeParse(params.get("status") ?? undefined);
    const typeParam    = typeParsed.success   ? typeParsed.data   : undefined;
    const statusParam  = statusParsed.success ? statusParsed.data : undefined;

    const page  = Math.max(1, parseInt(params.get("page")  ?? "1",  10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(params.get("limit") ?? "20", 10) || 20));
    const skip  = (page - 1) * limit;

    const where = {
      ...(unitFilter
        ? { unitId: unitFilter }
        : role === "RECEPTIONIST"
        ? { unitId: { in: unitIds } }
        : {}),
      ...(typeParam   ? { type:   typeParam }   : {}),
      ...(statusParam ? { status: statusParam } : {}),
    };

    const [spaces, total] = await Promise.all([
      db.space.findMany({
        where,
        orderBy: [{ type: "asc" }, { name: "asc" }],
        skip,
        take: limit,
        include: {
          unit:   { select: { id: true, name: true } },
          _count: { select: { bookings: true, serviceOrders: true } },
        },
      }),
      db.space.count({ where }),
    ]);

    return NextResponse.json({ data: spaces, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } });
  },
  ["ADMIN", "RECEPTIONIST"],
);

export const POST = withAuth(
  async (req) => {
    const body   = await req.json();
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
  },
  ["ADMIN"],
);

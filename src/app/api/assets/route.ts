import { NextResponse } from "next/server";
import { z } from "zod";
import { AssetStatus, AssetType } from "@prisma/client";
import { db } from "@/lib/db";
import { withAuth } from "@/lib/rbac";
import { CreateAssetSchema } from "@/lib/validations/asset";
import { PAGE_SIZE } from "@/lib/constants";

const StatusSchema = z.nativeEnum(AssetStatus).optional();
const TypeSchema   = z.nativeEnum(AssetType).optional();

export const GET = withAuth(
  async (req, session) => {
    const { role, unitIds } = session.user;
    const sp = req.nextUrl.searchParams;

    const unitFilter  = role === "ADMIN" ? sp.get("unitId") ?? undefined : undefined;
    const statusParsed = StatusSchema.safeParse(sp.get("status") ?? undefined);
    const typeParsed   = TypeSchema.safeParse(sp.get("type") ?? undefined);
    const page = Math.max(1, parseInt(sp.get("page") ?? "1", 10) || 1);
    const skip = (page - 1) * PAGE_SIZE;

    const where = {
      ...(unitFilter ? { unitId: unitFilter } : role === "RECEPTIONIST" ? { unitId: { in: unitIds } } : {}),
      ...(statusParsed.success && statusParsed.data ? { status: statusParsed.data } : {}),
      ...(typeParsed.success   && typeParsed.data   ? { type:   typeParsed.data   } : {}),
    };

    const [assets, total] = await Promise.all([
      db.asset.findMany({
        where,
        orderBy: { code: "asc" },
        skip,
        take: PAGE_SIZE,
        include: {
          unit:  { select: { id: true, name: true } },
          space: { select: { id: true, name: true } },
          _count: { select: { serviceOrders: true } },
        },
      }),
      db.asset.count({ where }),
    ]);

    return NextResponse.json({ data: assets, meta: { total, page, totalPages: Math.ceil(total / PAGE_SIZE) } });
  },
  ["ADMIN", "RECEPTIONIST"],
);

export const POST = withAuth(
  async (req) => {
    const body   = await req.json();
    const parsed = CreateAssetSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Dados inválidos", code: "VALIDATION_ERROR" }, { status: 400 });
    }

    const data = parsed.data;

    // Verificar unicidade do código
    const existing = await db.asset.findUnique({ where: { code: data.code } });
    if (existing) {
      return NextResponse.json({ error: "Etiqueta já cadastrada", code: "DUPLICATE_CODE" }, { status: 409 });
    }

    const asset = await db.asset.create({
      data: {
        unitId:            data.unitId,
        spaceId:           data.spaceId,
        code:              data.code,
        name:              data.name,
        description:       data.description,
        type:              data.type,
        brand:             data.brand,
        assetModel:        data.assetModel,
        serialNumber:      data.serialNumber,
        purchasedAt:       data.purchasedAt ? new Date(data.purchasedAt) : undefined,
        warrantyExpiresAt: data.warrantyExpiresAt ? new Date(data.warrantyExpiresAt) : undefined,
        notes:             data.notes,
      },
      include: {
        unit:  { select: { id: true, name: true } },
        space: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json(asset, { status: 201 });
  },
  ["ADMIN"],
);

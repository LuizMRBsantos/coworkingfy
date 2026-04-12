import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { withAuth } from "@/lib/rbac";
import { UpdateAssetSchema } from "@/lib/validations/asset";

interface RouteContext {
  params: Promise<{ id: string }>;
}

const ASSET_INCLUDE = {
  unit:  { select: { id: true, name: true } },
  space: { select: { id: true, name: true } },
  serviceOrders: {
    orderBy: { createdAt: "desc" as const },
    take: 20,
    include: {
      ticket:    { select: { number: true, priority: true } },
      createdBy: { select: { name: true } },
      provider:  { select: { name: true } },
    },
  },
  maintenancePlans: {
    where:   { isActive: true },
    orderBy: { nextRunAt: "asc" as const },
    take: 5,
  },
  _count: { select: { serviceOrders: true } },
} as const;

export const GET = withAuth(
  async (_req, session, { params }: RouteContext) => {
    const { role, unitIds } = session.user;
    const { id } = await params;

    const asset = await db.asset.findUnique({ where: { id }, include: ASSET_INCLUDE });
    if (!asset) return NextResponse.json({ error: "Ativo não encontrado" }, { status: 404 });

    if (role === "RECEPTIONIST" && !unitIds.includes(asset.unitId)) {
      return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
    }

    // Custo acumulado (soma de OS com value)
    const costAgg = await db.serviceOrder.aggregate({
      where:  { assetId: id, value: { not: null } },
      _sum:   { value: true },
    });

    return NextResponse.json({ ...asset, accumulatedCost: costAgg._sum.value });
  },
  ["ADMIN", "RECEPTIONIST"],
);

export const PUT = withAuth(
  async (req, _session, { params }: RouteContext) => {
    const { id } = await params;

    const asset = await db.asset.findUnique({ where: { id } });
    if (!asset) return NextResponse.json({ error: "Ativo não encontrado" }, { status: 404 });

    const body   = await req.json();
    const parsed = UpdateAssetSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Dados inválidos", code: "VALIDATION_ERROR" }, { status: 400 });
    }

    const data = parsed.data;

    const updated = await db.asset.update({
      where: { id },
      data:  {
        spaceId:           data.spaceId ?? null,
        name:              data.name,
        description:       data.description ?? null,
        brand:             data.brand ?? null,
        assetModel:        data.assetModel ?? null,
        serialNumber:      data.serialNumber ?? null,
        purchasedAt:       data.purchasedAt       ? new Date(data.purchasedAt)       : null,
        warrantyExpiresAt: data.warrantyExpiresAt ? new Date(data.warrantyExpiresAt) : null,
        notes:             data.notes ?? null,
        status:            data.status,
      },
      include: ASSET_INCLUDE,
    });

    return NextResponse.json(updated);
  },
  ["ADMIN"],
);

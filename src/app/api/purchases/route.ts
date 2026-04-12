import { NextResponse } from "next/server";
import { z } from "zod";
import { Prisma, PurchaseCategory } from "@prisma/client";
import { db } from "@/lib/db";
import { withAuth } from "@/lib/rbac";
import { CreatePurchaseSchema } from "@/lib/validations/purchase";
import { PAGE_SIZE } from "@/lib/constants";

const CategorySchema = z.enum(PurchaseCategory).optional();

export const GET = withAuth(
  async (req, session) => {
    const { role, unitIds } = session.user;
    const sp = req.nextUrl.searchParams;

    const unitFilter = role === "ADMIN" ? sp.get("unitId") ?? undefined : undefined;
    const catParsed  = CategorySchema.safeParse(sp.get("category") ?? undefined);
    const catFilter  = catParsed.success ? catParsed.data : undefined;

    // Filtro de período
    const from = sp.get("from") ? new Date(sp.get("from")!) : undefined;
    const to   = sp.get("to")   ? new Date(sp.get("to")!)   : undefined;

    const page = Math.max(1, parseInt(sp.get("page") ?? "1", 10) || 1);
    const skip = (page - 1) * PAGE_SIZE;

    const where = {
      ...(unitFilter ? { unitId: unitFilter } : role === "RECEPTIONIST" ? { unitId: { in: unitIds } } : {}),
      ...(catFilter  ? { category: catFilter } : {}),
      ...(from || to ? { purchasedAt: { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) } } : {}),
    };

    const [purchases, total] = await Promise.all([
      db.purchase.findMany({
        where,
        orderBy: { purchasedAt: "desc" },
        skip,
        take: PAGE_SIZE,
        include: {
          unit:      { select: { id: true, name: true } },
          createdBy: { select: { id: true, name: true } },
        },
      }),
      db.purchase.count({ where }),
    ]);

    // Totais por categoria
    const totals = await db.purchase.groupBy({
      by:    ["category"],
      where,
      _sum:  { value: true },
    });

    return NextResponse.json({
      data:  purchases.map((p) => ({ ...p, value: p.value.toString() })),
      meta:  { total, page, totalPages: Math.ceil(total / PAGE_SIZE) },
      totals: totals.map((t) => ({ category: t.category, total: t._sum.value?.toString() ?? "0" })),
    });
  },
  ["ADMIN", "RECEPTIONIST"],
);

export const POST = withAuth(
  async (req, session) => {
    const { role, unitIds, id: userId } = session.user;

    const body   = await req.json();
    const parsed = CreatePurchaseSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Dados inválidos", code: "VALIDATION_ERROR" }, { status: 400 });
    }

    const data = parsed.data;

    if (role === "RECEPTIONIST" && !unitIds.includes(data.unitId)) {
      return NextResponse.json({ error: "Sem permissão para esta unidade" }, { status: 403 });
    }

    const purchase = await db.purchase.create({
      data: {
        unitId:      data.unitId,
        category:    data.category,
        description: data.description,
        value:       new Prisma.Decimal(data.value),
        purchasedAt: new Date(data.purchasedAt),
        createdById: userId,
        notes:       data.notes,
      },
      include: {
        unit:      { select: { id: true, name: true } },
        createdBy: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json({ ...purchase, value: purchase.value.toString() }, { status: 201 });
  },
  ["ADMIN", "RECEPTIONIST"],
);

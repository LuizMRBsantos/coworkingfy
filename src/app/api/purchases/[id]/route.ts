import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { withAuth } from "@/lib/rbac";
import { UpdatePurchaseSchema } from "@/lib/validations/purchase";

export const GET = withAuth(
  async (_req, session, { params }: { params: Promise<{ id: string }> }) => {
    const { id } = await params;
    const { role, unitIds } = session.user;

    const purchase = await db.purchase.findUnique({
      where: { id },
      include: {
        unit:      { select: { id: true, name: true } },
        createdBy: { select: { id: true, name: true } },
      },
    });

    if (!purchase) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });

    if (role === "RECEPTIONIST" && !unitIds.includes(purchase.unitId)) {
      return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
    }

    return NextResponse.json({ ...purchase, value: purchase.value.toString() });
  },
  ["ADMIN", "RECEPTIONIST"],
);

export const PUT = withAuth(
  async (req, session, { params }: { params: Promise<{ id: string }> }) => {
    const { id } = await params;
    const { role, unitIds } = session.user;

    const purchase = await db.purchase.findUnique({ where: { id } });
    if (!purchase) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });

    if (role === "RECEPTIONIST" && !unitIds.includes(purchase.unitId)) {
      return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
    }

    const body   = await req.json();
    const parsed = UpdatePurchaseSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Dados inválidos", code: "VALIDATION_ERROR" }, { status: 400 });
    }

    const data = parsed.data;

    const updated = await db.purchase.update({
      where: { id },
      data: {
        ...(data.category    !== undefined ? { category:    data.category }                        : {}),
        ...(data.description !== undefined ? { description: data.description }                     : {}),
        ...(data.value       !== undefined ? { value:       new Prisma.Decimal(data.value) }       : {}),
        ...(data.purchasedAt !== undefined ? { purchasedAt: new Date(data.purchasedAt) }           : {}),
        ...(data.notes       !== undefined ? { notes:       data.notes || null }                   : {}),
      },
      include: {
        unit:      { select: { id: true, name: true } },
        createdBy: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json({ ...updated, value: updated.value.toString() });
  },
  ["ADMIN", "RECEPTIONIST"],
);

export const DELETE = withAuth(
  async (_req, session, { params }: { params: Promise<{ id: string }> }) => {
    const { id } = await params;
    const { role, unitIds } = session.user;

    const purchase = await db.purchase.findUnique({ where: { id } });
    if (!purchase) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });

    if (role === "RECEPTIONIST" && !unitIds.includes(purchase.unitId)) {
      return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
    }

    await db.purchase.delete({ where: { id } });

    return NextResponse.json({ ok: true });
  },
  ["ADMIN", "RECEPTIONIST"],
);

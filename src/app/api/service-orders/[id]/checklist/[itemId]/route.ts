import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { withAuth } from "@/lib/rbac";

const PatchSchema = z.object({
  isCompleted: z.boolean(),
});

interface RouteContext {
  params: Promise<{ id: string; itemId: string }>;
}

export const PATCH = withAuth(
  async (req, session, { params }: RouteContext) => {
    const { role, unitIds } = session.user;
    const { id, itemId } = await params;

    // Verificar se OS existe e se o usuário tem acesso
    const serviceOrder = await db.serviceOrder.findUnique({
      where:  { id },
      select: { id: true, unitId: true, status: true },
    });
    if (!serviceOrder) {
      return NextResponse.json({ error: "OS não encontrada" }, { status: 404 });
    }
    if (role === "RECEPTIONIST" && !unitIds.includes(serviceOrder.unitId)) {
      return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
    }
    // Só pode marcar checklist em OS em andamento
    if (serviceOrder.status !== "IN_PROGRESS") {
      return NextResponse.json(
        { error: "Checklist só pode ser marcado quando a OS está em andamento", code: "INVALID_STATUS" },
        { status: 400 },
      );
    }

    const body   = await req.json();
    const parsed = PatchSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Dados inválidos", code: "VALIDATION_ERROR" }, { status: 400 });
    }

    const { isCompleted } = parsed.data;

    const item = await db.serviceOrderChecklistItem.findUnique({ where: { id: itemId } });
    if (!item || item.serviceOrderId !== id) {
      return NextResponse.json({ error: "Item não encontrado" }, { status: 404 });
    }

    const updated = await db.serviceOrderChecklistItem.update({
      where: { id: itemId },
      data: {
        isCompleted,
        completedAt: isCompleted ? new Date() : null,
      },
    });

    return NextResponse.json(updated);
  },
  ["ADMIN", "RECEPTIONIST"],
);

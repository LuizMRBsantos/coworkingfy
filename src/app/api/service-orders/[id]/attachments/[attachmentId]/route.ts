import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { withAuth } from "@/lib/rbac";

interface RouteContext {
  params: Promise<{ id: string; attachmentId: string }>;
}

export const DELETE = withAuth(
  async (_req, session, { params }: RouteContext) => {
    const { role, unitIds } = session.user;
    const { id: serviceOrderId, attachmentId } = await params;

    const attachment = await db.serviceOrderAttachment.findUnique({
      where:   { id: attachmentId },
      include: { serviceOrder: { select: { unitId: true } } },
    });

    if (!attachment || attachment.serviceOrderId !== serviceOrderId) {
      return NextResponse.json({ error: "Anexo não encontrado" }, { status: 404 });
    }

    if (role === "RECEPTIONIST" && !unitIds.includes(attachment.serviceOrder.unitId)) {
      return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
    }

    await db.serviceOrderAttachment.delete({ where: { id: attachmentId } });

    return new NextResponse(null, { status: 204 });
  },
  ["ADMIN", "RECEPTIONIST"],
);

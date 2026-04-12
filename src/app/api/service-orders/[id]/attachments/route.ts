import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { withAuth } from "@/lib/rbac";
import { CreateAttachmentSchema } from "@/lib/validations/service-order";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export const GET = withAuth(
  async (_req, session, { params }: RouteContext) => {
    const { role, unitIds } = session.user;
    const { id: serviceOrderId } = await params;

    const serviceOrder = await db.serviceOrder.findUnique({
      where:   { id: serviceOrderId },
      select:  { unitId: true },
    });
    if (!serviceOrder) return NextResponse.json({ error: "OS não encontrada" }, { status: 404 });

    if (role === "RECEPTIONIST" && !unitIds.includes(serviceOrder.unitId)) {
      return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
    }

    const attachments = await db.serviceOrderAttachment.findMany({
      where:   { serviceOrderId },
      include: { uploadedBy: { select: { id: true, name: true } } },
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json(attachments);
  },
  ["ADMIN", "RECEPTIONIST"],
);

export const POST = withAuth(
  async (req, session, { params }: RouteContext) => {
    const { role, unitIds, id: userId } = session.user;
    const { id: serviceOrderId } = await params;

    const serviceOrder = await db.serviceOrder.findUnique({
      where:  { id: serviceOrderId },
      select: { unitId: true },
    });
    if (!serviceOrder) return NextResponse.json({ error: "OS não encontrada" }, { status: 404 });

    if (role === "RECEPTIONIST" && !unitIds.includes(serviceOrder.unitId)) {
      return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
    }

    const body   = await req.json();
    const parsed = CreateAttachmentSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Dados inválidos", code: "VALIDATION_ERROR" }, { status: 400 });
    }

    const attachment = await db.serviceOrderAttachment.create({
      data: {
        serviceOrderId,
        uploadedById: userId,
        name: parsed.data.name,
        url:  parsed.data.url,
      },
      include: { uploadedBy: { select: { id: true, name: true } } },
    });

    return NextResponse.json(attachment, { status: 201 });
  },
  ["ADMIN", "RECEPTIONIST"],
);

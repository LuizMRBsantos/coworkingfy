import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { UpdateServiceOrderStatusSchema } from "@/lib/validations/service-order";
import type { Priority, Role, ServiceOrderStatus } from "@prisma/client";

const SLA_HOURS: Record<Priority, number> = {
  URGENT: 24,
  HIGH: 48,
  MEDIUM: 120, // 5 dias
  LOW: 360,    // 15 dias
};

function calculateSlaDeadline(priority: Priority, approvedAt: Date): Date {
  const deadline = new Date(approvedAt);
  deadline.setHours(deadline.getHours() + SLA_HOURS[priority]);
  return deadline;
}

type TransitionRule = {
  from: ServiceOrderStatus[];
  allowedRoles: Role[];
};

const TRANSITIONS: Record<string, TransitionRule> = {
  PENDING_APPROVAL: { from: ["DRAFT"],                                                allowedRoles: ["ADMIN", "RECEPTIONIST"] },
  APPROVED:         { from: ["PENDING_APPROVAL"],                                     allowedRoles: ["ADMIN"] },
  REJECTED:         { from: ["PENDING_APPROVAL"],                                     allowedRoles: ["ADMIN"] },
  IN_PROGRESS:      { from: ["APPROVED"],                                             allowedRoles: ["ADMIN", "RECEPTIONIST"] },
  DONE:             { from: ["IN_PROGRESS"],                                          allowedRoles: ["ADMIN", "RECEPTIONIST"] },
  CANCELLED:        { from: ["DRAFT", "PENDING_APPROVAL", "APPROVED", "IN_PROGRESS"], allowedRoles: ["ADMIN", "RECEPTIONIST"] },
};

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const { role, unitIds } = session.user;
  if (role === "MEMBER") return NextResponse.json({ error: "Sem permissão" }, { status: 403 });

  const { id } = await params;

  const serviceOrder = await db.serviceOrder.findUnique({
    where: { id },
    include: {
      unit:      { select: { id: true, name: true } },
      space:     { select: { id: true, name: true } },
      createdBy: { select: { id: true, name: true } },
      approvedBy:{ select: { id: true, name: true } },
      provider:  { select: { id: true, name: true, type: true } },
    },
  });

  if (!serviceOrder) return NextResponse.json({ error: "OS não encontrada" }, { status: 404 });

  if (role === "RECEPTIONIST" && !unitIds.includes(serviceOrder.unitId)) {
    return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
  }

  return NextResponse.json(serviceOrder);
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const { role, unitIds, id: userId } = session.user;
  if (role === "MEMBER") return NextResponse.json({ error: "Sem permissão" }, { status: 403 });

  const body = await req.json();
  const parsed = UpdateServiceOrderStatusSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Dados inválidos", code: "VALIDATION_ERROR" }, { status: 400 });
  }

  const { status: newStatus, providerId } = parsed.data;
  const { id } = await params;

  const serviceOrder = await db.serviceOrder.findUnique({
    where: { id },
    include: { ticket: { select: { priority: true } } },
  });
  if (!serviceOrder) return NextResponse.json({ error: "OS não encontrada" }, { status: 404 });

  if (role === "RECEPTIONIST" && !unitIds.includes(serviceOrder.unitId)) {
    return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
  }

  const rule = TRANSITIONS[newStatus];

  if (!rule.from.includes(serviceOrder.status)) {
    return NextResponse.json(
      { error: `Transição inválida: ${serviceOrder.status} → ${newStatus}`, code: "INVALID_TRANSITION" },
      { status: 400 }
    );
  }

  if (!rule.allowedRoles.includes(role)) {
    return NextResponse.json(
      { error: "Seu perfil não tem permissão para esta transição" },
      { status: 403 }
    );
  }

  const now = new Date();
  const extraData: Record<string, unknown> = {};

  if (newStatus === "APPROVED") {
    extraData.approvedById = userId;
    extraData.approvedAt = now;
    extraData.slaDeadline = calculateSlaDeadline(serviceOrder.ticket.priority, now);
  }

  if (providerId !== undefined) {
    extraData.providerId = providerId;
  }

  const updated = await db.serviceOrder.update({
    where: { id },
    data: { status: newStatus, ...extraData },
    include: {
      unit:      { select: { id: true, name: true } },
      createdBy: { select: { id: true, name: true } },
      approvedBy:{ select: { id: true, name: true } },
      provider:  { select: { id: true, name: true, type: true } },
    },
  });

  return NextResponse.json(updated);
}

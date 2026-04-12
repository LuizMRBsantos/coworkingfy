import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { withAuth } from "@/lib/rbac";
import { SLA_ATTENDANCE, SLA_RESOLUTION } from "@/lib/constants";
import { addBusinessHours } from "@/lib/businessHours";
import { UpdateServiceOrderStatusSchema } from "@/lib/validations/service-order";
import { logActivity } from "@/lib/activity-logger";
import { sendProviderApprovalEmail } from "@/lib/mailer";
import type { Priority, Role, ServiceOrderStatus } from "@prisma/client";

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
  VALIDATED:        { from: ["DONE"],                                                 allowedRoles: ["ADMIN"] },
  CANCELLED:        { from: ["DRAFT", "PENDING_APPROVAL", "APPROVED", "IN_PROGRESS"], allowedRoles: ["ADMIN", "RECEPTIONIST"] },
};

const SERVICE_ORDER_INCLUDE = {
  unit:        { select: { id: true, name: true, address: true, clientName: true, clientContact: true } },
  space:       { select: { id: true, name: true } },
  asset:       { select: { id: true, name: true, code: true } },
  ticket:      { select: { id: true, number: true, description: true, priority: true, createdAt: true } },
  createdBy:   { select: { id: true, name: true } },
  approvedBy:  { select: { id: true, name: true } },
  provider:    { select: { id: true, name: true, type: true, phone: true, email: true } },
  checklists:  true,
  attachments: { include: { uploadedBy: { select: { id: true, name: true } } } },
} as const;

interface RouteContext {
  params: Promise<{ id: string }>;
}

export const GET = withAuth(
  async (_req, session, { params }: RouteContext) => {
    const { role, unitIds } = session.user;
    const { id } = await params;

    const serviceOrder = await db.serviceOrder.findUnique({
      where:   { id },
      include: SERVICE_ORDER_INCLUDE,
    });

    if (!serviceOrder) return NextResponse.json({ error: "OS não encontrada" }, { status: 404 });

    if (role === "RECEPTIONIST" && !unitIds.includes(serviceOrder.unitId)) {
      return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
    }

    return NextResponse.json(serviceOrder);
  },
  ["ADMIN", "RECEPTIONIST"],
);

export const PUT = withAuth(
  async (req, session, { params }: RouteContext) => {
    const { role, unitIds, id: userId, name: userName } = session.user;

    const body   = await req.json();
    const parsed = UpdateServiceOrderStatusSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Dados inválidos", code: "VALIDATION_ERROR" }, { status: 400 });
    }

    const { status: newStatus, providerId, cancellationReason, executionReport } = parsed.data;
    const { id } = await params;

    const serviceOrder = await db.serviceOrder.findUnique({
      where:   { id },
      include: { ticket: { select: { priority: true } } },
    });
    if (!serviceOrder) return NextResponse.json({ error: "OS não encontrada" }, { status: 404 });

    if (role === "RECEPTIONIST" && !unitIds.includes(serviceOrder.unitId)) {
      return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
    }

    const rule = TRANSITIONS[newStatus];
    if (!rule) {
      return NextResponse.json({ error: "Status inválido", code: "INVALID_STATUS" }, { status: 400 });
    }

    if (!rule.from.includes(serviceOrder.status)) {
      return NextResponse.json(
        { error: `Transição inválida: ${serviceOrder.status} → ${newStatus}`, code: "INVALID_TRANSITION" },
        { status: 400 },
      );
    }

    if (!rule.allowedRoles.includes(role)) {
      return NextResponse.json(
        { error: "Seu perfil não tem permissão para esta transição" },
        { status: 403 },
      );
    }

    // CANCELLED exige motivo
    if (newStatus === "CANCELLED" && !cancellationReason?.trim()) {
      return NextResponse.json(
        { error: "Motivo de cancelamento é obrigatório", code: "REASON_REQUIRED" },
        { status: 400 },
      );
    }

    // DONE via PUT: usado por finish-by-provider e finish-remote (que já validam fotos/relatório)
    // O fluxo manual do gestor passa por /finish-manual que aceita multipart
    if (newStatus === "DONE") {
      const pendingChecklist = await db.serviceOrderChecklistItem.count({
        where: { serviceOrderId: id, isCompleted: false },
      });
      if (pendingChecklist > 0) {
        return NextResponse.json(
          { error: `${pendingChecklist} item(s) do checklist ainda não foram concluídos`, code: "CHECKLIST_PENDING" },
          { status: 400 },
        );
      }
    }

    const now = new Date();
    const extraData: Record<string, unknown> = {};

    if (newStatus === "APPROVED") {
      const priority: Priority = serviceOrder.ticket?.priority ?? "MEDIUM";
      extraData.approvedById          = userId;
      extraData.approvedAt            = now;
      extraData.slaAttendanceDeadline = addBusinessHours(now, SLA_ATTENDANCE[priority]);
      extraData.slaResolutionDeadline = addBusinessHours(now, SLA_RESOLUTION[priority]);
    }

    if (newStatus === "IN_PROGRESS") {
      extraData.startedAt = now;
    }

    if (newStatus === "DONE") {
      extraData.completedAt = now;
      if (executionReport) extraData.executionReport = executionReport;
    }

    if (newStatus === "VALIDATED") {
      extraData.validatedAt = now;
    }

    if (newStatus === "CANCELLED") {
      extraData.cancelledAt        = now;
      extraData.cancellationReason = cancellationReason;
    }

    if (providerId !== undefined) {
      extraData.providerId = providerId;
    }

    const needsToken = newStatus === "APPROVED" && (serviceOrder.providerId || providerId);

    const { updated, providerTokenValue } = await db.$transaction(async (tx) => {
      const os = await tx.serviceOrder.update({
        where:   { id },
        data:    { status: newStatus, ...extraData },
        include: SERVICE_ORDER_INCLUDE,
      });

      // Criar ou substituir token do prestador (+7 dias) quando aprovado com prestador vinculado
      let providerTokenValue: string | null = null;
      if (needsToken) {
        const tokenRecord = await tx.providerToken.upsert({
          where:  { serviceOrderId: id },
          create: {
            serviceOrderId: id,
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          },
          update: {
            usedAt:    null,
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          },
          select: { token: true },
        });
        providerTokenValue = tokenRecord.token;
      }

      await logActivity({
        tx,
        entityType:      "SERVICE_ORDER",
        entityId:        id,
        action:          "STATUS_CHANGED",
        fromStatus:      serviceOrder.status,
        toStatus:        newStatus,
        performedById:   userId,
        performedByName: userName ?? null,
      });

      return { updated: os, providerTokenValue };
    });

    // Fire-and-forget: envia link mágico ao prestador quando OS é aprovada com prestador vinculado
    if (providerTokenValue && updated.provider?.email) {
      sendProviderApprovalEmail({
        to:           updated.provider.email,
        providerName: updated.provider.name,
        osNumber:     updated.number,
        unitName:     updated.unit.name,
        description:  updated.description,
        token:        providerTokenValue,
      }).catch((err: unknown) =>
        console.error("[mailer] sendProviderApprovalEmail failed:", err),
      );
    }

    return NextResponse.json(updated);
  },
  ["ADMIN", "RECEPTIONIST"],
);

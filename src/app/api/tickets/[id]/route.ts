import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { withAuth } from "@/lib/rbac";
import { logActivity } from "@/lib/activity-logger";
import type { TicketStatus, Role } from "@prisma/client";

const UpdateTicketStatusSchema = z.object({
  status: z.enum(["IN_PROGRESS", "PENDING_CLOSE", "CLOSED"]),
});

interface TransitionRule {
  from:         TicketStatus[];
  allowedRoles: Role[];
}

const TRANSITIONS: Record<string, TransitionRule> = {
  IN_PROGRESS:   { from: ["OPEN"],           allowedRoles: ["ADMIN", "RECEPTIONIST"] },
  PENDING_CLOSE: { from: ["IN_PROGRESS"],    allowedRoles: ["RECEPTIONIST"] },
  CLOSED:        { from: ["PENDING_CLOSE"],  allowedRoles: ["ADMIN"] },
  // ADMIN pode também fechar diretamente do IN_PROGRESS (caso rejeite o PENDING_CLOSE)
  // e devolver para IN_PROGRESS cancelando o pedido de fechamento
};

// Transições especiais do ADMIN
const ADMIN_EXTRA_TRANSITIONS: Record<string, TransitionRule> = {
  // Admin pode fechar direto de IN_PROGRESS (sem precisar de PENDING_CLOSE)
  CLOSED: { from: ["PENDING_CLOSE", "IN_PROGRESS"], allowedRoles: ["ADMIN"] },
  // Admin pode rejeitar pedido de fechamento devolvendo para IN_PROGRESS
  IN_PROGRESS: { from: ["OPEN", "PENDING_CLOSE"], allowedRoles: ["ADMIN", "RECEPTIONIST"] },
};

interface RouteContext {
  params: Promise<{ id: string }>;
}

export const GET = withAuth(
  async (_req, session, { params }: RouteContext) => {
    const { role, unitIds } = session.user;
    const { id } = await params;

    const ticket = await db.ticket.findUnique({
      where: { id },
      include: {
        unit:      { select: { id: true, name: true } },
        createdBy: { select: { id: true, name: true } },
        serviceOrders: {
          orderBy: { createdAt: "desc" },
          include: {
            createdBy: { select: { id: true, name: true } },
            provider:  { select: { id: true, name: true, type: true } },
          },
        },
      },
    });

    if (!ticket) return NextResponse.json({ error: "Ticket não encontrado" }, { status: 404 });

    if (role === "RECEPTIONIST" && !unitIds.includes(ticket.unitId)) {
      return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
    }

    return NextResponse.json(ticket);
  },
  ["ADMIN", "RECEPTIONIST"],
);

export const PUT = withAuth(
  async (req, session, { params }: RouteContext) => {
    const body   = await req.json();
    const parsed = UpdateTicketStatusSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Dados inválidos", code: "VALIDATION_ERROR" }, { status: 400 });
    }

    const { status: newStatus } = parsed.data;
    const { id } = await params;
    const role   = session.user.role;

    const ticket = await db.ticket.findUnique({ where: { id } });
    if (!ticket) return NextResponse.json({ error: "Ticket não encontrado" }, { status: 404 });

    // RECEPTIONIST: só acessa tickets da sua unidade
    if (role === "RECEPTIONIST" && !session.user.unitIds.includes(ticket.unitId)) {
      return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
    }

    // Escolhe a regra: ADMIN tem acesso ampliado
    const rule = role === "ADMIN"
      ? (ADMIN_EXTRA_TRANSITIONS[newStatus] ?? TRANSITIONS[newStatus])
      : TRANSITIONS[newStatus];

    if (!rule) {
      return NextResponse.json({ error: "Transição inválida", code: "INVALID_TRANSITION" }, { status: 400 });
    }

    if (!rule.allowedRoles.includes(role)) {
      return NextResponse.json({ error: "Sem permissão para esta transição", code: "FORBIDDEN_TRANSITION" }, { status: 403 });
    }

    if (!rule.from.includes(ticket.status)) {
      return NextResponse.json(
        { error: `Transição inválida: ${ticket.status} → ${newStatus}`, code: "INVALID_TRANSITION" },
        { status: 400 },
      );
    }

    const ticketData: Record<string, unknown> = { status: newStatus };
    if (newStatus === "IN_PROGRESS") ticketData.startedAt  = new Date();
    if (newStatus === "CLOSED")      ticketData.resolvedAt = new Date();

    const updated = await db.$transaction(async (tx) => {
      const t = await tx.ticket.update({
        where: { id },
        data:  ticketData,
        include: {
          unit:      { select: { id: true, name: true } },
          createdBy: { select: { id: true, name: true } },
          _count:    { select: { serviceOrders: true } },
        },
      });

      await logActivity({
        tx,
        entityType:      "TICKET",
        entityId:        id,
        action:          "STATUS_CHANGED",
        fromStatus:      ticket.status,
        toStatus:        newStatus,
        performedById:   session.user.id,
        performedByName: session.user.name ?? null,
      });

      return t;
    });

    return NextResponse.json(updated);
  },
  ["ADMIN", "RECEPTIONIST"],
);

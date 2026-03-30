import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";
import type { TicketStatus } from "@prisma/client";

const UpdateTicketStatusSchema = z.object({
  status: z.enum(["IN_PROGRESS", "CLOSED"] as const),
});

const TRANSITIONS: Record<string, { from: TicketStatus[] }> = {
  IN_PROGRESS: { from: ["OPEN"] },
  CLOSED:      { from: ["IN_PROGRESS"] },
};

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const { role, unitId } = session.user;
  if (role === "MEMBER") return NextResponse.json({ error: "Sem permissão" }, { status: 403 });

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

  if (role === "RECEPTIONIST" && ticket.unitId !== unitId) {
    return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
  }

  return NextResponse.json(ticket);
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  if (session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
  }

  const body = await req.json();
  const parsed = UpdateTicketStatusSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Dados inválidos", code: "VALIDATION_ERROR" }, { status: 400 });
  }

  const { status: newStatus } = parsed.data;
  const { id } = await params;

  const ticket = await db.ticket.findUnique({ where: { id } });
  if (!ticket) return NextResponse.json({ error: "Ticket não encontrado" }, { status: 404 });

  const rule = TRANSITIONS[newStatus];
  if (!rule.from.includes(ticket.status)) {
    return NextResponse.json(
      { error: `Transição inválida: ${ticket.status} → ${newStatus}`, code: "INVALID_TRANSITION" },
      { status: 400 }
    );
  }

  const updated = await db.ticket.update({
    where: { id },
    data: { status: newStatus },
    include: {
      unit:      { select: { id: true, name: true } },
      createdBy: { select: { id: true, name: true } },
      _count:    { select: { serviceOrders: true } },
    },
  });

  return NextResponse.json(updated);
}

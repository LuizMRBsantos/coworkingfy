import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { withAuth } from "@/lib/rbac";
import { AppError } from "@/lib/errors";
import { CANCEL_HOURS_BEFORE } from "@/lib/constants";
import { UpdateBookingSchema } from "@/lib/validations/booking";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export const GET = withAuth(async (_req, session, { params }: RouteContext) => {
  const { id } = await params;

  const booking = await db.booking.findUnique({
    where: { id },
    include: {
      space: {
        select: {
          id: true, name: true, type: true, capacity: true,
          unit: { select: { id: true, name: true } },
        },
      },
      user:       { select: { id: true, name: true, email: true } },
      approvedBy: { select: { id: true, name: true } },
    },
  });

  if (!booking) return NextResponse.json({ error: "Reserva não encontrada" }, { status: 404 });

  if (session.user.role === "MEMBER" && booking.userId !== session.user.id) {
    return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
  }

  return NextResponse.json(booking);
});

export const PUT = withAuth(
  async (req, session, { params }: RouteContext) => {
    const { role, unitIds, id: staffId } = session.user;

    const body   = await req.json();
    const parsed = UpdateBookingSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Dados inválidos", code: "VALIDATION_ERROR" }, { status: 400 });
    }

    const { action } = parsed.data;
    const { id }     = await params;

    try {
      const booking = await db.$transaction(async (tx) => {
        const existing = await tx.booking.findUnique({
          where:   { id },
          include: { space: { select: { unitId: true } } },
        });

        if (!existing)
          throw new AppError("Reserva não encontrada", "NOT_FOUND", 404);

        // RECEPTIONIST só gerencia reservas da sua unidade
        if (role === "RECEPTIONIST" && !unitIds.includes(existing.space.unitId)) {
          throw new AppError("Sem permissão para esta unidade", "FORBIDDEN", 403);
        }

        if (action === "approve") {
          if (existing.status !== "PENDING_APPROVAL") {
            throw new AppError("Apenas reservas pendentes podem ser aprovadas", "INVALID_STATUS", 409);
          }

          // Verificar conflito com CONFIRMED ao aprovar
          const conflict = await tx.booking.findFirst({
            where: {
              spaceId:   existing.spaceId,
              status:    "CONFIRMED",
              startTime: { lt: existing.endTime },
              endTime:   { gt: existing.startTime },
              id:        { not: id },
            },
          });

          if (conflict)
            throw new AppError("Horário indisponível — já existe uma reserva confirmada neste período", "CONFLICT", 409);

          return tx.booking.update({
            where: { id },
            data:  { status: "CONFIRMED", approvedById: staffId, approvedAt: new Date() },
            include: {
              space: { select: { id: true, name: true, unit: { select: { id: true, name: true } } } },
              user:  { select: { id: true, name: true } },
            },
          });
        }

        if (action === "reject") {
          if (existing.status !== "PENDING_APPROVAL") {
            throw new AppError("Apenas reservas pendentes podem ser rejeitadas", "INVALID_STATUS", 409);
          }

          return tx.booking.update({
            where: { id },
            data:  { status: "REJECTED", approvedById: staffId, approvedAt: new Date() },
            include: {
              space: { select: { id: true, name: true, unit: { select: { id: true, name: true } } } },
              user:  { select: { id: true, name: true } },
            },
          });
        }

        // action === "cancel" — RECEPTIONIST/ADMIN pode cancelar qualquer reserva
        if (existing.status === "CANCELLED" || existing.status === "REJECTED") {
          throw new AppError("Reserva já encerrada", "ALREADY_CLOSED", 409);
        }

        return tx.booking.update({
          where: { id },
          data:  { status: "CANCELLED" },
          include: {
            space: { select: { id: true, name: true, unit: { select: { id: true, name: true } } } },
            user:  { select: { id: true, name: true } },
          },
        });
      });

      return NextResponse.json(booking);
    } catch (e) {
      if (e instanceof AppError) {
        return NextResponse.json({ error: e.message, code: e.code }, { status: e.status });
      }
      throw e;
    }
  },
  ["ADMIN", "RECEPTIONIST"],
);

export const DELETE = withAuth(async (_req, session, { params }: RouteContext) => {
  const { id } = await params;

  const booking = await db.booking.findUnique({ where: { id } });
  if (!booking) return NextResponse.json({ error: "Reserva não encontrada" }, { status: 404 });

  // MEMBER só cancela as próprias reservas
  if (session.user.role === "MEMBER" && booking.userId !== session.user.id) {
    return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
  }

  if (booking.status === "CANCELLED" || booking.status === "REJECTED") {
    return NextResponse.json({ error: "Reserva já encerrada", code: "ALREADY_CLOSED" }, { status: 409 });
  }

  // Só permite cancelar PENDING_APPROVAL ou CONFIRMED (com regra das 2h)
  if (booking.status === "CONFIRMED") {
    const limitTime = new Date(booking.startTime.getTime() - CANCEL_HOURS_BEFORE * 60 * 60 * 1000);
    if (new Date() > limitTime) {
      return NextResponse.json(
        { error: `Cancelamento não permitido com menos de ${CANCEL_HOURS_BEFORE}h de antecedência`, code: "TOO_LATE" },
        { status: 409 },
      );
    }
  }

  const updated = await db.booking.update({
    where: { id },
    data:  { status: "CANCELLED" },
    include: {
      space: { select: { id: true, name: true, unit: { select: { id: true, name: true } } } },
      user:  { select: { id: true, name: true } },
    },
  });

  return NextResponse.json(updated);
});

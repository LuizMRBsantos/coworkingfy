import { NextResponse } from "next/server";
import { z } from "zod";
import { Prisma, BookingStatus } from "@prisma/client";
import { db } from "@/lib/db";
import { withAuth } from "@/lib/rbac";
import { AppError } from "@/lib/errors";
import { OPEN_HOUR, CLOSE_HOUR, MIN_DURATION_MINUTES } from "@/lib/constants";
import { getBusinessHour } from "@/lib/date-utils";
import { CreateBookingSchema } from "@/lib/validations/booking";

const StatusSchema = z.nativeEnum(BookingStatus).optional();

export const GET = withAuth(async (req, session) => {
  const { role, unitIds, id: userId } = session.user;
  const params     = req.nextUrl.searchParams;
  const upcoming   = params.get("upcoming") === "true";
  const unitFilter = role === "ADMIN" ? params.get("unitId") ?? undefined : undefined;

  const statusParsed = StatusSchema.safeParse(params.get("status") ?? undefined);
  const statusParam  = statusParsed.success ? statusParsed.data : undefined;

  const page  = Math.max(1, parseInt(params.get("page")  ?? "1",  10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(params.get("limit") ?? "20", 10) || 20));
  const skip  = (page - 1) * limit;

  const where: Prisma.BookingWhereInput = {
    ...(role === "MEMBER"       ? { userId }                                              : {}),
    ...(role === "RECEPTIONIST" ? { space: { unitId: { in: unitIds } } }                 : {}),
    ...(unitFilter              ? { space: { unitId: unitFilter } }                       : {}),
    ...(statusParam             ? { status: statusParam }                                 : {}),
    ...(upcoming                ? { startTime: { gte: new Date() }, status: "CONFIRMED" } : {}),
  };

  const [bookings, total] = await Promise.all([
    db.booking.findMany({
      where,
      orderBy: { startTime: "asc" },
      skip,
      take: limit,
      include: {
        space: {
          select: {
            id: true, name: true, type: true,
            unit: { select: { id: true, name: true } },
          },
        },
        user:       { select: { id: true, name: true, email: true } },
        approvedBy: { select: { id: true, name: true } },
      },
    }),
    db.booking.count({ where }),
  ]);

  return NextResponse.json({ data: bookings, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } });
});

export const POST = withAuth(async (req, session) => {
  const body   = await req.json();
  const parsed = CreateBookingSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Dados inválidos", code: "VALIDATION_ERROR" }, { status: 400 });
  }

  const { spaceId, startTime: startStr, endTime: endStr } = parsed.data;
  const start = new Date(startStr);
  const end   = new Date(endStr);

  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    return NextResponse.json({ error: "Datas inválidas", code: "VALIDATION_ERROR" }, { status: 400 });
  }

  const startHour = getBusinessHour(start);
  const endHour   = getBusinessHour(end);
  if (startHour < OPEN_HOUR || endHour > CLOSE_HOUR) {
    return NextResponse.json(
      { error: `Horário fora do funcionamento (${OPEN_HOUR}h–${CLOSE_HOUR}h)`, code: "OUT_OF_HOURS" },
      { status: 400 },
    );
  }

  if (start >= end) {
    return NextResponse.json({ error: "Horário de início deve ser antes do término", code: "INVALID_RANGE" }, { status: 400 });
  }

  const durationMinutes = (end.getTime() - start.getTime()) / 60000;
  if (durationMinutes < MIN_DURATION_MINUTES) {
    return NextResponse.json(
      { error: `Duração mínima é ${MIN_DURATION_MINUTES} minutos`, code: "TOO_SHORT" },
      { status: 400 },
    );
  }

  if (start < new Date()) {
    return NextResponse.json({ error: "Não é possível reservar no passado", code: "PAST_DATE" }, { status: 400 });
  }

  const { role, id: userId } = session.user;

  // RECEPTIONIST e ADMIN criam direto como CONFIRMED (com verificação de conflito)
  // MEMBER cria como PENDING_APPROVAL (sem conflito — verificado na aprovação)
  const isStaff = role === "ADMIN" || role === "RECEPTIONIST";

  try {
    const booking = await db.$transaction(async (tx) => {
      const space = await tx.space.findUnique({ where: { id: spaceId } });

      if (!space)
        throw new AppError("Espaço não encontrado", "SPACE_NOT_FOUND", 404);
      if (space.status === "MAINTENANCE")
        throw new AppError("Espaço em manutenção, não aceita reservas", "SPACE_MAINTENANCE", 409);
      if (space.status === "INACTIVE")
        throw new AppError("Espaço inativo", "SPACE_INACTIVE", 409);

      // Conflito só é verificado na criação para STAFF — para MEMBER ocorre na aprovação
      if (isStaff) {
        const conflict = await tx.booking.findFirst({
          where: {
            spaceId,
            status:    "CONFIRMED",
            startTime: { lt: end },
            endTime:   { gt: start },
          },
        });
        if (conflict)
          throw new AppError("Horário indisponível para este espaço", "CONFLICT", 409);
      }

      return tx.booking.create({
        data: {
          userId,
          spaceId,
          startTime: start,
          endTime:   end,
          status:    isStaff ? "CONFIRMED" : "PENDING_APPROVAL",
        },
        include: {
          space: {
            select: {
              id: true, name: true, type: true,
              unit: { select: { id: true, name: true } },
            },
          },
          user: { select: { id: true, name: true } },
        },
      });
    });

    return NextResponse.json(booking, { status: 201 });
  } catch (e) {
    if (e instanceof AppError) {
      return NextResponse.json({ error: e.message, code: e.code }, { status: e.status });
    }
    throw e;
  }
});

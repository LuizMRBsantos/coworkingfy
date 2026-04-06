import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";

const OPEN_HOUR            = 7;
const CLOSE_HOUR           = 22;
const MIN_DURATION_MINUTES = 30;

const CreateBookingSchema = z.object({
  spaceId:   z.string().min(1, "Espaço obrigatório"),
  startTime: z.string().min(1, "Horário de início obrigatório"),
  endTime:   z.string().min(1, "Horário de término obrigatório"),
});

class BookingError extends Error {
  constructor(public message: string, public code: string, public status: number) {
    super(message);
  }
}

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const { role, unitIds, id: userId } = session.user;
  const params   = req.nextUrl.searchParams;
  const upcoming = params.get("upcoming") === "true";
  const unitFilter = role === "ADMIN" ? params.get("unitId") ?? undefined : undefined;
  const statusParam = params.get("status");

  const bookings = await db.booking.findMany({
    where: {
      ...(role === "MEMBER"       ? { userId }                                             : {}),
      ...(role === "RECEPTIONIST" ? { space: { unitId: { in: unitIds } } }                : {}),
      ...(unitFilter              ? { space: { unitId: unitFilter } }                      : {}),
      ...(statusParam             ? { status: statusParam as "PENDING_APPROVAL" | "CONFIRMED" | "CANCELLED" | "REJECTED" } : {}),
      ...(upcoming                ? { startTime: { gte: new Date() }, status: "CONFIRMED" } : {}),
    },
    orderBy: { startTime: "asc" },
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
  });

  return NextResponse.json(bookings);
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

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

  const startHour = start.getHours() + start.getMinutes() / 60;
  const endHour   = end.getHours()   + end.getMinutes()   / 60;
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
        throw new BookingError("Espaço não encontrado", "SPACE_NOT_FOUND", 404);
      if (space.status === "MAINTENANCE")
        throw new BookingError("Espaço em manutenção, não aceita reservas", "SPACE_MAINTENANCE", 409);
      if (space.status === "INACTIVE")
        throw new BookingError("Espaço inativo", "SPACE_INACTIVE", 409);

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
          throw new BookingError("Horário indisponível para este espaço", "CONFLICT", 409);
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
    if (e instanceof BookingError) {
      return NextResponse.json({ error: e.message, code: e.code }, { status: e.status });
    }
    throw e;
  }
}

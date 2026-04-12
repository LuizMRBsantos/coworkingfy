import { NextResponse } from "next/server";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { withAuth } from "@/lib/rbac";
import { CreateTicketSchema } from "@/lib/validations/ticket";
import { addBusinessHours } from "@/lib/businessHours";
import { SLA_ATTENDANCE, SLA_RESOLUTION } from "@/lib/constants";

const StatusSchema = z.enum(["OPEN", "IN_PROGRESS", "PENDING_CLOSE", "CLOSED"]).optional();

export const GET = withAuth(
  async (req, session) => {
    const { role, unitIds } = session.user;
    const unitFilter = role === "ADMIN"
      ? req.nextUrl.searchParams.get("unitId") ?? undefined
      : undefined;

    const statusParsed = StatusSchema.safeParse(req.nextUrl.searchParams.get("status") ?? undefined);
    const statusParam  = statusParsed.success ? statusParsed.data : undefined;

    const page  = Math.max(1, parseInt(req.nextUrl.searchParams.get("page")  ?? "1",  10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.nextUrl.searchParams.get("limit") ?? "20", 10) || 20));
    const skip  = (page - 1) * limit;

    const where = {
      ...(unitFilter ? { unitId: unitFilter } : role === "RECEPTIONIST" ? { unitId: { in: unitIds } } : {}),
      ...(statusParam ? { status: statusParam } : {}),
    };

    const [tickets, total] = await Promise.all([
      db.ticket.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
        include: {
          unit:      { select: { id: true, name: true } },
          createdBy: { select: { id: true, name: true } },
          _count:    { select: { serviceOrders: true } },
        },
      }),
      db.ticket.count({ where }),
    ]);

    return NextResponse.json({ data: tickets, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } });
  },
  ["ADMIN", "RECEPTIONIST"],
);

export const POST = withAuth(
  async (req, session) => {
    const body   = await req.json();
    const parsed = CreateTicketSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Dados inválidos", code: "VALIDATION_ERROR" }, { status: 400 });
    }

    const data = parsed.data;
    const now  = new Date();

    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const ticket = await db.$transaction(async (tx) => {
          const year  = new Date().getFullYear();
          const count = await tx.ticket.count({
            where: { number: { startsWith: `TK-${year}-` } },
          });
          const number = `TK-${year}-${String(count + 1).padStart(4, "0")}`;

          return tx.ticket.create({
            data: {
              number,
              unitId:               data.unitId,
              externalTicketId:     data.externalTicketId ?? null,
              description:          data.description,
              priority:             data.priority,
              status:               "OPEN",
              createdById:          session.user.id,
              slaAttendanceDeadline: addBusinessHours(now, SLA_ATTENDANCE[data.priority]),
              slaResolutionDeadline: addBusinessHours(now, SLA_RESOLUTION[data.priority]),
            },
            include: {
              unit:      { select: { id: true, name: true } },
              createdBy: { select: { id: true, name: true } },
            },
          });
        });

        return NextResponse.json(ticket, { status: 201 });
      } catch (e) {
        const isUniqueViolation =
          e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002";
        if (isUniqueViolation && attempt < 2) continue;
        throw e;
      }
    }

    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  },
  ["ADMIN"],
);

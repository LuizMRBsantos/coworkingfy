import { NextResponse } from "next/server";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { withAuth } from "@/lib/rbac";
import { CreateServiceOrderSchema } from "@/lib/validations/service-order";

const StatusSchema = z.enum([
  "DRAFT", "PENDING_APPROVAL", "APPROVED", "IN_PROGRESS",
  "DONE", "VALIDATED", "REJECTED", "CANCELLED",
]).optional();

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

    const [serviceOrders, total] = await Promise.all([
      db.serviceOrder.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
        include: {
          unit:      { select: { id: true, name: true } },
          createdBy: { select: { id: true, name: true } },
          provider:  { select: { id: true, name: true, type: true } },
        },
      }),
      db.serviceOrder.count({ where }),
    ]);

    return NextResponse.json({ data: serviceOrders, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } });
  },
  ["ADMIN", "RECEPTIONIST"],
);

export const POST = withAuth(
  async (req, session) => {
    const { role, unitIds: userUnitIds, id: userId } = session.user;

    const body   = await req.json();
    const parsed = CreateServiceOrderSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Dados inválidos", code: "VALIDATION_ERROR" }, { status: 400 });
    }

    const data = parsed.data;

    if (role === "RECEPTIONIST" && !userUnitIds.includes(data.unitId)) {
      return NextResponse.json({ error: "Sem permissão para esta unidade" }, { status: 403 });
    }

    // Bloquear criação de OS em ticket fechado ou pendente de fechamento
    if (data.ticketId) {
      const ticket = await db.ticket.findUnique({ where: { id: data.ticketId }, select: { status: true } });
      if (!ticket) {
        return NextResponse.json({ error: "Ticket não encontrado", code: "TICKET_NOT_FOUND" }, { status: 404 });
      }
      if (ticket.status === "CLOSED" || ticket.status === "PENDING_CLOSE") {
        return NextResponse.json(
          { error: "Ticket encerrado — não é possível criar novas OS", code: "TICKET_CLOSED" },
          { status: 409 },
        );
      }
    }

    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const serviceOrder = await db.$transaction(async (tx) => {
          const year  = new Date().getFullYear();
          const count = await tx.serviceOrder.count({
            where: { number: { startsWith: `OS-${year}-` } },
          });
          const number = `OS-${year}-${String(count + 1).padStart(4, "0")}`;

          return tx.serviceOrder.create({
            data: {
              number,
              ticketId:      data.ticketId,
              unitId:        data.unitId,
              spaceId:       data.spaceId,
              createdById:         userId,
              serviceType:         data.serviceType,
              description:         data.description,
              providerId:          data.providerId,
              scheduledDate:       data.scheduledDate ? new Date(data.scheduledDate) : undefined,
              value:               data.value ? new Prisma.Decimal(data.value) : undefined,
              isRemote:            data.isRemote ?? false,
              specialInstructions: data.specialInstructions,
              status:              "DRAFT",
            },
            include: {
              unit:      { select: { id: true, name: true } },
              createdBy: { select: { id: true, name: true } },
            },
          });
        });

        return NextResponse.json(serviceOrder, { status: 201 });
      } catch (e) {
        const isUniqueViolation =
          e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002";
        if (isUniqueViolation && attempt < 2) continue;
        throw e;
      }
    }

    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  },
  ["ADMIN", "RECEPTIONIST"],
);

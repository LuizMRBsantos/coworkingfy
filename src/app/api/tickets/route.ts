import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { Prisma, Priority } from "@prisma/client";
import { z } from "zod";
import type { TicketStatus } from "@prisma/client";

const CreateTicketSchema = z.object({
  unitId:          z.string().min(1),
  externalTicketId: z.string().optional(),
  description:     z.string().min(10, "Descrição deve ter pelo menos 10 caracteres"),
  priority:        z.nativeEnum(Priority),
});

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const { role, unitIds } = session.user;
  if (role === "MEMBER") return NextResponse.json({ error: "Sem permissão" }, { status: 403 });

  const unitFilter = role === "ADMIN"
    ? req.nextUrl.searchParams.get("unitId") ?? undefined
    : undefined;

  const statusParam = req.nextUrl.searchParams.get("status") as TicketStatus | null;

  const tickets = await db.ticket.findMany({
    where: {
      ...(unitFilter ? { unitId: unitFilter } : role === "RECEPTIONIST" ? { unitId: { in: unitIds } } : {}),
      ...(statusParam ? { status: statusParam } : {}),
    },
    orderBy: { createdAt: "desc" },
    include: {
      unit:      { select: { id: true, name: true } },
      createdBy: { select: { id: true, name: true } },
      _count:    { select: { serviceOrders: true } },
    },
  });

  return NextResponse.json(tickets);
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  if (session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
  }

  const body = await req.json();
  const parsed = CreateTicketSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Dados inválidos", code: "VALIDATION_ERROR" }, { status: 400 });
  }

  const data = parsed.data;

  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const ticket = await db.$transaction(async (tx) => {
        const year = new Date().getFullYear();
        const count = await tx.ticket.count({
          where: { number: { startsWith: `TK-${year}-` } },
        });
        const number = `TK-${year}-${String(count + 1).padStart(4, "0")}`;

        return tx.ticket.create({
          data: {
            number,
            unitId:           data.unitId,
            externalTicketId: data.externalTicketId ?? null,
            description:      data.description,
            priority:         data.priority,
            status:           "OPEN",
            createdById:      session.user.id,
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
}

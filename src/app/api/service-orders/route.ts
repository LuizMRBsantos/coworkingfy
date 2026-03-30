import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { Prisma } from "@prisma/client";
import { CreateServiceOrderSchema } from "@/lib/validations/service-order";
import type { ServiceOrderStatus } from "@prisma/client";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  if (session.user.role === "MEMBER") {
    return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
  }

  const { role, unitIds } = session.user;
  const unitFilter = role === "ADMIN"
    ? req.nextUrl.searchParams.get("unitId") ?? undefined
    : undefined;

  const statusParam = req.nextUrl.searchParams.get("status") as ServiceOrderStatus | null;

  const serviceOrders = await db.serviceOrder.findMany({
    where: {
      ...(unitFilter ? { unitId: unitFilter } : role === "RECEPTIONIST" ? { unitId: { in: unitIds } } : {}),
      ...(statusParam ? { status: statusParam } : {}),
    },
    orderBy: { createdAt: "desc" },
    include: {
      unit:     { select: { id: true, name: true } },
      createdBy:{ select: { id: true, name: true } },
      provider: { select: { id: true, name: true, type: true } },
    },
  });

  return NextResponse.json(serviceOrders);
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const { role, unitIds: userUnitIds, id: userId } = session.user;

  if (role === "MEMBER") return NextResponse.json({ error: "Sem permissão" }, { status: 403 });

  const body = await req.json();
  const parsed = CreateServiceOrderSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Dados inválidos", code: "VALIDATION_ERROR" }, { status: 400 });
  }

  const data = parsed.data;

  if (role === "RECEPTIONIST" && !userUnitIds.includes(data.unitId)) {
    return NextResponse.json({ error: "Sem permissão para esta unidade" }, { status: 403 });
  }

  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const serviceOrder = await db.$transaction(async (tx) => {
        const year = new Date().getFullYear();
        const count = await tx.serviceOrder.count({
          where: { number: { startsWith: `OS-${year}-` } },
        });
        const number = `OS-${year}-${String(count + 1).padStart(4, "0")}`;

        return tx.serviceOrder.create({
          data: {
            number,
            ticketId: data.ticketId,
            unitId: data.unitId,
            spaceId: data.spaceId,
            createdById: userId,
            serviceType: data.serviceType,
            description: data.description,
            providerId: data.providerId,
            scheduledDate: data.scheduledDate ? new Date(data.scheduledDate) : undefined,
            value: data.value ? new Prisma.Decimal(data.value) : undefined,
            status: "DRAFT",
          },
          include: {
            unit:     { select: { id: true, name: true } },
            createdBy:{ select: { id: true, name: true } },
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

  // Fallback — nunca deve chegar aqui
  return NextResponse.json({ error: "Erro interno" }, { status: 500 });
}

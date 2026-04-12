import { NextResponse } from "next/server";
import { Prisma, PlanFrequency } from "@prisma/client";
import { db } from "@/lib/db";

// Calcula a próxima data de execução com base na frequência
function addFrequency(date: Date, frequency: PlanFrequency): Date {
  const d = new Date(date);
  switch (frequency) {
    case "DAILY":         d.setDate(d.getDate() + 1);         break;
    case "WEEKLY":        d.setDate(d.getDate() + 7);         break;
    case "MONTHLY":       d.setMonth(d.getMonth() + 1);       break;
    case "QUARTERLY":     d.setMonth(d.getMonth() + 3);       break;
    case "SEMI_ANNUALLY": d.setMonth(d.getMonth() + 6);       break;
    case "ANNUALLY":      d.setFullYear(d.getFullYear() + 1); break;
  }
  return d;
}

export async function GET(req: Request) {
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const auth = req.headers.get("authorization") ?? "";
    if (auth !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const now      = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);

  // Busca admin para usar como criador das OS geradas automaticamente
  const adminUser = await db.user.findFirst({
    where:  { role: "ADMIN", active: true },
    select: { id: true },
  });
  if (!adminUser) {
    return NextResponse.json({ error: "Nenhum ADMIN ativo encontrado" }, { status: 500 });
  }

  // Planos ativos cuja execução vence até amanhã — inclui checklists e prestador padrão
  const plans = await db.maintenancePlan.findMany({
    where:   { isActive: true, nextRunAt: { lte: tomorrow } },
    select: {
      id:          true,
      unitId:      true,
      assetId:     true,
      spaceId:     true,
      providerId:  true,
      name:        true,
      serviceType: true,
      frequency:   true,
      nextRunAt:   true,
      checklists:  { orderBy: { id: "asc" } },
    },
  });

  let created = 0;
  let skipped = 0;

  for (const plan of plans) {
    // Verifica se já existe OS ativa para este plano
    const existing = await db.serviceOrder.findFirst({
      where: {
        maintenancePlanId: plan.id,
        status: { in: ["DRAFT", "PENDING_APPROVAL", "APPROVED", "IN_PROGRESS"] },
      },
    });

    if (existing) {
      skipped++;
    } else {
      // Gera número sequencial com retry
      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          await db.$transaction(async (tx) => {
            const year  = now.getFullYear();
            const count = await tx.serviceOrder.count({
              where: { number: { startsWith: `OS-${year}-` } },
            });
            const number = `OS-${year}-${String(count + 1).padStart(4, "0")}`;

            const newOs = await tx.serviceOrder.create({
              data: {
                number,
                unitId:            plan.unitId,
                assetId:           plan.assetId ?? undefined,
                spaceId:           plan.spaceId ?? undefined,
                providerId:        plan.providerId ?? undefined,
                maintenancePlanId: plan.id,
                createdById:       adminUser.id,
                serviceType:       plan.serviceType,
                description:       `[Preventiva] ${plan.name}`,
                status:            "DRAFT",
              },
            });

            // Copiar itens de checklist do plano para a OS
            if (plan.checklists.length > 0) {
              await tx.serviceOrderChecklistItem.createMany({
                data: plan.checklists.map((c) => ({
                  serviceOrderId: newOs.id,
                  item:           c.item,
                })),
              });
            }
          });
          created++;
          // Avança datas apenas quando OS foi criada com sucesso
          await db.maintenancePlan.update({
            where: { id: plan.id },
            data: {
              lastRunAt: now,
              nextRunAt: addFrequency(plan.nextRunAt, plan.frequency),
            },
          });
          break;
        } catch (e) {
          const isUnique = e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002";
          if (isUnique && attempt < 2) continue;
          throw e;
        }
      }
    }
  }

  return NextResponse.json({
    processed: plans.length,
    created,
    skipped,
    runAt: now.toISOString(),
  });
}

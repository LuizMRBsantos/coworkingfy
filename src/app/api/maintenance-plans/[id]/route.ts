import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { withAuth } from "@/lib/rbac";
import { UpdateMaintenancePlanSchema } from "@/lib/validations/maintenance-plan";

export const GET = withAuth(
  async (req, session, { params }: { params: Promise<{ id: string }> }) => {
    const { id } = await params;
    const { role, unitIds } = session.user;

    const plan = await db.maintenancePlan.findUnique({
      where: { id },
      include: {
        unit:  { select: { id: true, name: true } },
        asset: { select: { id: true, name: true, code: true } },
        space: { select: { id: true, name: true } },
        checklists: { orderBy: { id: "asc" } },
        serviceOrders: {
          orderBy: { createdAt: "desc" },
          select: {
            id:          true,
            number:      true,
            status:      true,
            createdAt:   true,
            completedAt: true,
          },
        },
      },
    });

    if (!plan) {
      return NextResponse.json({ error: "Plano não encontrado" }, { status: 404 });
    }

    if (role === "RECEPTIONIST" && !unitIds.includes(plan.unitId)) {
      return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
    }

    return NextResponse.json(plan);
  },
  ["ADMIN", "RECEPTIONIST"],
);

export const PUT = withAuth(
  async (req, _session, { params }: { params: Promise<{ id: string }> }) => {
    const { id } = await params;

    const plan = await db.maintenancePlan.findUnique({ where: { id } });
    if (!plan) {
      return NextResponse.json({ error: "Plano não encontrado" }, { status: 404 });
    }

    const body   = await req.json();
    const parsed = UpdateMaintenancePlanSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Dados inválidos", code: "VALIDATION_ERROR" }, { status: 400 });
    }

    const { checklists, ...data } = parsed.data;

    const updated = await db.$transaction(async (tx) => {
      // Atualizar dados do plano
      const updatedPlan = await tx.maintenancePlan.update({
        where: { id },
        data: {
          ...(data.assetId     !== undefined ? { assetId:     data.assetId    || null } : {}),
          ...(data.spaceId     !== undefined ? { spaceId:     data.spaceId    || null } : {}),
          ...(data.providerId  !== undefined ? { providerId:  data.providerId || null } : {}),
          ...(data.name        !== undefined ? { name:        data.name }               : {}),
          ...(data.description !== undefined ? { description: data.description || null }: {}),
          ...(data.frequency   !== undefined ? { frequency:   data.frequency }          : {}),
          ...(data.serviceType !== undefined ? { serviceType: data.serviceType }        : {}),
          ...(data.priority    !== undefined ? { priority:    data.priority }           : {}),
          ...(data.nextRunAt   !== undefined ? { nextRunAt:   new Date(data.nextRunAt) }: {}),
          ...(data.isActive    !== undefined ? { isActive:    data.isActive }           : {}),
        },
        include: {
          unit:       { select: { id: true, name: true } },
          asset:      { select: { id: true, name: true, code: true } },
          space:      { select: { id: true, name: true } },
          checklists: { orderBy: { id: "asc" } },
        },
      });

      // Substituir checklist se fornecido
      if (checklists !== undefined) {
        await tx.planChecklistItem.deleteMany({ where: { planId: id } });
        if (checklists.length > 0) {
          await tx.planChecklistItem.createMany({
            data: checklists.map((item) => ({ planId: id, item, isRequired: true })),
          });
        }
        // Re-buscar com checklists atualizados
        return tx.maintenancePlan.findUnique({
          where: { id },
          include: {
            unit:       { select: { id: true, name: true } },
            asset:      { select: { id: true, name: true, code: true } },
            space:      { select: { id: true, name: true } },
            checklists: { orderBy: { id: "asc" } },
          },
        });
      }

      return updatedPlan;
    });

    return NextResponse.json(updated);
  },
  ["ADMIN"],
);

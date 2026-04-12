import { NextResponse } from "next/server";
import { PlanFrequency, ServiceType, Priority } from "@prisma/client";
import { db } from "@/lib/db";
import { withAuth } from "@/lib/rbac";
import { CreateUnitSchema } from "@/lib/validations/unit";

// ---------------------------------------------------------------------------
// Planos base gerados automaticamente ao criar unidade
// ---------------------------------------------------------------------------

interface BasePlan {
  name:        string;
  serviceType: ServiceType;
  frequency:   PlanFrequency;
  priority:    Priority;
  daysFromNow: number;
}

const BASE_PLANS: BasePlan[] = [
  { name: "Limpeza diária",                serviceType: "CLEANING",   frequency: "DAILY",         priority: "MEDIUM", daysFromNow: 1   },
  { name: "Limpeza de filtros de AC",      serviceType: "OTHER",      frequency: "MONTHLY",       priority: "MEDIUM", daysFromNow: 30  },
  { name: "Manutenção completa de AC",     serviceType: "OTHER",      frequency: "QUARTERLY",     priority: "HIGH",   daysFromNow: 90  },
  { name: "Reposição de insumos limpeza",  serviceType: "CLEANING",   frequency: "MONTHLY",       priority: "LOW",    daysFromNow: 30  },
  { name: "Reposição de insumos cozinha",  serviceType: "CLEANING",   frequency: "MONTHLY",       priority: "LOW",    daysFromNow: 30  },
  { name: "Reposição de insumos escritório", serviceType: "OTHER",    frequency: "MONTHLY",       priority: "LOW",    daysFromNow: 30  },
  { name: "Vistoria de extintores",        serviceType: "OTHER",      frequency: "ANNUALLY",      priority: "HIGH",   daysFromNow: 365 },
  { name: "Limpeza de caixa d'água",       serviceType: "HYDRAULIC",  frequency: "SEMI_ANNUALLY", priority: "MEDIUM", daysFromNow: 180 },
  { name: "Dedetização",                   serviceType: "CLEANING",   frequency: "QUARTERLY",     priority: "MEDIUM", daysFromNow: 90  },
];

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

export const GET = withAuth(
  async () => {
    const units = await db.unit.findMany({
      orderBy: [{ type: "asc" }, { name: "asc" }],
      include: {
        _count: {
          select: {
            spaces:        true,
            tickets:       true,
            serviceOrders: true,
            providers:     true,
          },
        },
        userUnits: {
          select: { user: { select: { id: true, name: true, role: true } } },
        },
      },
    });

    return NextResponse.json(units);
  },
  ["ADMIN"],
);

export const POST = withAuth(
  async (req) => {
    const body   = await req.json();
    const parsed = CreateUnitSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Dados inválidos", code: "VALIDATION_ERROR" }, { status: 400 });
    }

    const { name, type } = parsed.data;

    const now = new Date();

    const unit = await db.$transaction(async (tx) => {
      const created = await tx.unit.create({ data: { name, type } });

      // Gera os 9 planos base automaticamente
      await tx.maintenancePlan.createMany({
        data: BASE_PLANS.map((p) => ({
          unitId:      created.id,
          name:        p.name,
          serviceType: p.serviceType,
          frequency:   p.frequency,
          priority:    p.priority,
          nextRunAt:   addDays(now, p.daysFromNow),
        })),
      });

      return created;
    });

    return NextResponse.json(unit, { status: 201 });
  },
  ["ADMIN"],
);

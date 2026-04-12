import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { MaintenancePlanCard } from "@/components/shared/MaintenancePlanCard";
import { MaintenancePlanFilters } from "@/components/shared/MaintenancePlanFilters";
import { Pagination } from "@/components/shared/Pagination";
import { PAGE_SIZE } from "@/lib/constants";
import { Plus } from "lucide-react";
import type { PlanFrequency } from "@prisma/client";

interface PageProps {
  searchParams: Promise<{ unitId?: string; frequency?: string; isActive?: string; page?: string }>;
}

export default async function MaintenancePlansPage({ searchParams }: PageProps) {
  const session = await auth();
  if (!session) redirect("/login");
  if (session.user.role !== "ADMIN") redirect("/dashboard");

  const sp        = await searchParams;
  const unitFilter  = sp.unitId    ?? undefined;
  const freqFilter  = sp.frequency as PlanFrequency | undefined;
  const activeParam = sp.isActive;
  const activeFilter = activeParam === "false" ? false : activeParam === "true" ? true : undefined;
  const page        = Math.max(1, parseInt(sp.page ?? "1", 10) || 1);
  const skip        = (page - 1) * PAGE_SIZE;

  const where = {
    ...(unitFilter                   ? { unitId:   unitFilter }   : {}),
    ...(freqFilter                   ? { frequency: freqFilter }  : {}),
    ...(activeFilter !== undefined   ? { isActive:  activeFilter } : {}),
  };

  const [plans, total, units] = await Promise.all([
    db.maintenancePlan.findMany({
      where,
      orderBy: { nextRunAt: "asc" },
      skip,
      take: PAGE_SIZE,
      include: {
        unit:  { select: { id: true, name: true } },
        asset: { select: { id: true, name: true, code: true } },
        space: { select: { id: true, name: true } },
        _count: { select: { serviceOrders: true } },
      },
    }),
    db.maintenancePlan.count({ where }),
    db.unit.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
  ]);

  const totalPages = Math.ceil(total / PAGE_SIZE);

  // Monta search params preservados para Pagination
  const spObj: Record<string, string> = {};
  if (unitFilter)              spObj.unitId    = unitFilter;
  if (freqFilter)              spObj.frequency = freqFilter;
  if (activeParam !== undefined && activeParam !== "") spObj.isActive = activeParam;

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Planos de Manutenção</h1>
          <p className="text-sm text-gray-500 mt-0.5">PMOC — programa de manutenção preventiva e corretiva</p>
        </div>
        <Link href="/dashboard/admin/maintenance-plans/new">
          <Button size="sm">
            <Plus className="h-4 w-4 mr-1" />
            Novo plano
          </Button>
        </Link>
      </div>

      {/* Filtros */}
      <MaintenancePlanFilters
        units={units}
        currentUnitId={unitFilter}
        currentFreq={freqFilter}
        currentActive={activeParam}
      />

      {/* Contador */}
      <p className="text-sm text-gray-500">{total} plano{total !== 1 ? "s" : ""} encontrado{total !== 1 ? "s" : ""}</p>

      {/* Lista */}
      {plans.length === 0 ? (
        <p className="text-sm text-gray-400 py-8 text-center">Nenhum plano encontrado.</p>
      ) : (
        <div className="space-y-3">
          {plans.map((plan) => (
            <MaintenancePlanCard
              key={plan.id}
              plan={plan}
              href={`/dashboard/admin/maintenance-plans/${plan.id}`}
            />
          ))}
        </div>
      )}

      <Pagination page={page} totalPages={totalPages} searchParams={spObj} />
    </div>
  );
}

import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { UnitHealthCard } from "@/components/shared/UnitHealthCard";
import { computeHealthScore } from "@/lib/healthScore";

export default async function OverviewPage() {
  const session = await auth();
  if (!session) redirect("/login");
  if (session.user.role !== "ADMIN") redirect("/dashboard");

  const units = await db.unit.findMany({
    orderBy: { name: "asc" },
    select: {
      id:   true,
      name: true,
      tickets: {
        select: { priority: true, status: true },
        where:  { status: { not: "CLOSED" } },
      },
      serviceOrders: {
        where: {
          status: { in: ["DRAFT","PENDING_APPROVAL","APPROVED","IN_PROGRESS","DONE","VALIDATED"] },
        },
        select: {
          id:                    true,
          status:                true,
          slaAttendanceDeadline: true,
          slaResolutionDeadline: true,
          startedAt:             true,
          completedAt:           true,
          validatedAt:           true,
          createdAt:             true,
        },
      },
      maintenancePlans: {
        where:   { isActive: true },
        select:  { id: true, nextRunAt: true, isActive: true },
        orderBy: { nextRunAt: "asc" },
      },
    },
  });

  const unitsWithScore = units.map((u) => ({
    ...u,
    health: computeHealthScore(u.tickets, u.serviceOrders, u.maintenancePlans),
  }));

  const BAND_ORDER: Record<string, number> = { red: 0, yellow: 1, green: 2, none: 3 };
  const sorted = [...unitsWithScore].sort((a, b) => {
    const bo = BAND_ORDER[a.health.band] - BAND_ORDER[b.health.band];
    if (bo !== 0) return bo;
    return a.health.score - b.health.score;
  });

  // Legenda de faixas
  const redCount    = sorted.filter((u) => u.health.band === "red").length;
  const yellowCount = sorted.filter((u) => u.health.band === "yellow").length;
  const greenCount  = sorted.filter((u) => u.health.band === "green").length;

  return (
    <div className="space-y-5">
      {/* Cabeçalho */}
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Saúde das Unidades</h1>
          <p className="text-sm text-gray-500 mt-0.5">Clique em uma unidade para ver o resumo completo</p>
        </div>

        {/* Resumo rápido */}
        <div className="flex items-center gap-3 text-xs font-medium">
          {redCount > 0 && (
            <span className="flex items-center gap-1.5 text-red-600">
              <span className="h-2 w-2 rounded-full bg-red-500" />
              {redCount} intervenção
            </span>
          )}
          {yellowCount > 0 && (
            <span className="flex items-center gap-1.5 text-amber-600">
              <span className="h-2 w-2 rounded-full bg-amber-400" />
              {yellowCount} atenção
            </span>
          )}
          {greenCount > 0 && (
            <span className="flex items-center gap-1.5 text-emerald-600">
              <span className="h-2 w-2 rounded-full bg-emerald-400" />
              {greenCount} em dia
            </span>
          )}
        </div>
      </div>

      {/* Grid de unidades — escala de 2 a 5 colunas conforme a tela */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-3">
        {sorted.map((u) => (
          <UnitHealthCard
            key={u.id}
            unitId={u.id}
            unitName={u.name}
            health={u.health}
          />
        ))}
      </div>
    </div>
  );
}

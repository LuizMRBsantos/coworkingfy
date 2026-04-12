import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { ServiceOrderCard } from "@/components/shared/ServiceOrderCard";
import { ServiceOrderFilters } from "@/components/shared/ServiceOrderFilters";
import { Pagination } from "@/components/shared/Pagination";
import { PAGE_SIZE } from "@/lib/constants";
import type { ServiceOrderStatus } from "@prisma/client";

interface PageProps {
  searchParams: Promise<{ status?: string; unitId?: string; page?: string }>;
}

export default async function ServiceOrdersPage({ searchParams }: PageProps) {
  const session = await auth();
  if (!session) redirect("/login");

  const { status, unitId, page: pageParam } = await searchParams;

  const { role, unitIds } = session.user;
  const unitFilter = role === "ADMIN" ? unitId : undefined;
  const page       = Math.max(1, parseInt(pageParam ?? "1", 10) || 1);
  const skip       = (page - 1) * PAGE_SIZE;

  const where = {
    ...(unitFilter ? { unitId: unitFilter } : role === "RECEPTIONIST" ? { unitId: { in: unitIds } } : {}),
    ...(status ? { status: status as ServiceOrderStatus } : {}),
  };

  const [serviceOrders, total, units] = await Promise.all([
    db.serviceOrder.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: PAGE_SIZE,
      select: {
        id:                    true,
        number:                true,
        status:                true,
        serviceType:           true,
        description:           true,
        createdAt:             true,
        startedAt:             true,
        slaAttendanceDeadline: true,
        slaResolutionDeadline: true,
        value:                 true,
        unit:      { select: { id: true, name: true } },
        createdBy: { select: { id: true, name: true } },
        provider:  { select: { id: true, name: true, type: true } },
      },
    }),
    db.serviceOrder.count({ where }),
    db.unit.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
  ]);

  const totalPages = Math.ceil(total / PAGE_SIZE);
  const sp: Record<string, string> = {};
  if (status) sp.status = status;
  if (unitId) sp.unitId = unitId;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Ordens de Serviço</h1>
        <p className="text-sm text-gray-500 mt-1">{total} OS encontrada{total !== 1 ? "s" : ""}</p>
      </div>

      <ServiceOrderFilters
        units={units}
        currentStatus={status}
        currentUnitId={role === "ADMIN" ? unitFilter : unitIds[0]}
        showUnitFilter={role === "ADMIN"}
      />

      <div className="grid gap-4">
        {serviceOrders.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            Nenhuma OS encontrada para os filtros selecionados.
          </div>
        ) : (
          serviceOrders.map((os) => <ServiceOrderCard key={os.id} serviceOrder={os} />)
        )}
      </div>

      <Pagination page={page} totalPages={totalPages} searchParams={sp} />
    </div>
  );
}

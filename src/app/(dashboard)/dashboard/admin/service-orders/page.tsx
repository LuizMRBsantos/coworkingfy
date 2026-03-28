import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { ServiceOrderCard } from "@/components/shared/ServiceOrderCard";
import { ServiceOrderFilters } from "@/components/shared/ServiceOrderFilters";
import type { ServiceOrderStatus } from "@prisma/client";

interface PageProps {
  searchParams: Promise<{ status?: string; unitId?: string }>;
}

export default async function ServiceOrdersPage({ searchParams }: PageProps) {
  const session = await auth();
  if (!session) redirect("/login");

  const { status, unitId } = await searchParams;

  const role = session.user.role;
  // RECEPTIONIST sempre usa sua própria unidade — ignora o ?unitId= da URL
  const unitFilter = role === "ADMIN" ? unitId : (session.user.unitId ?? undefined);

  const [serviceOrders, units] = await Promise.all([
    db.serviceOrder.findMany({
      where: {
        ...(unitFilter ? { unitId: unitFilter } : {}),
        ...(status ? { status: status as ServiceOrderStatus } : {}),
      },
      orderBy: { createdAt: "desc" },
      include: {
        unit: { select: { id: true, name: true } },
        createdBy: { select: { id: true, name: true } },
        provider: { select: { id: true, name: true, type: true } },
      },
    }),
    db.unit.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Ordens de Serviço</h1>
        <p className="text-sm text-gray-500 mt-1">{serviceOrders.length} OS encontradas</p>
      </div>

      <ServiceOrderFilters
        units={units}
        currentStatus={status}
        currentUnitId={unitFilter}
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
    </div>
  );
}

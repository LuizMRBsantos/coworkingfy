import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { MaintenancePlanForm } from "@/components/shared/MaintenancePlanForm";
import { ArrowLeft } from "lucide-react";

export default async function NewMaintenancePlanPage() {
  const session = await auth();
  if (!session) redirect("/login");
  if (session.user.role !== "ADMIN") redirect("/dashboard");

  const [units, assets, spaces, providers] = await Promise.all([
    db.unit.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
    db.asset.findMany({
      select: { id: true, name: true, code: true, unitId: true },
      where:  { status: { not: "DECOMMISSIONED" } },
      orderBy: { code: "asc" },
    }),
    db.space.findMany({
      select: { id: true, name: true, unitId: true, type: true },
      orderBy: { name: "asc" },
    }),
    db.provider.findMany({
      select:  { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/dashboard/admin/maintenance-plans">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-1" />
            Voltar
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Novo Plano de Manutenção</h1>
          <p className="text-sm text-gray-500 mt-0.5">Adicione um item ao PMOC da unidade</p>
        </div>
      </div>

      <div className="max-w-2xl">
        <MaintenancePlanForm
          units={units}
          assets={assets}
          spaces={spaces}
          providers={providers}
          backHref="/dashboard/admin/maintenance-plans"
        />
      </div>
    </div>
  );
}

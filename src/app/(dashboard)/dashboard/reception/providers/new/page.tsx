import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { ProviderForm } from "@/components/shared/ProviderForm";

export default async function NewReceptionProviderPage() {
  const session = await auth();
  if (!session) redirect("/login");
  if (session.user.role === "MEMBER") redirect("/dashboard");

  const { unitIds } = session.user;

  const units = await db.unit.findMany({
    where:   { userUnits: { some: { userId: session.user.id } } },
    select:  { id: true, name: true },
    orderBy: { name: "asc" },
  });

  // Se só há uma unidade, pré-fixa para simplificar o formulário
  const fixedUnitId = unitIds.length === 1 ? unitIds[0] : undefined;

  return (
    <div className="space-y-6 max-w-lg">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Novo Prestador</h1>
        <p className="text-sm text-gray-500 mt-1">Cadastre um prestador para sua unidade.</p>
      </div>

      <ProviderForm
        units={units}
        fixedUnitId={fixedUnitId}
        backHref="/dashboard/reception/providers"
      />
    </div>
  );
}

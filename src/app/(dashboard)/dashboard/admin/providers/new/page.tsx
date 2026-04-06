import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { ProviderForm } from "@/components/shared/ProviderForm";

export default async function NewAdminProviderPage() {
  const session = await auth();
  if (!session) redirect("/login");
  if (session.user.role !== "ADMIN") redirect("/dashboard");

  const units = await db.unit.findMany({
    select:  { id: true, name: true },
    orderBy: { name: "asc" },
  });

  return (
    <div className="space-y-6 max-w-lg">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Novo Prestador</h1>
        <p className="text-sm text-gray-500 mt-1">Cadastre um prestador de serviço para uma unidade.</p>
      </div>

      <ProviderForm units={units} backHref="/dashboard/admin/providers" />
    </div>
  );
}

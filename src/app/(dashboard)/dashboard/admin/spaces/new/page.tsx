import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { SpaceForm } from "@/components/shared/SpaceForm";

export default async function NewSpacePage() {
  const session = await auth();
  if (!session) redirect("/login");
  if (session.user.role !== "ADMIN") redirect("/dashboard");

  // Apenas unidades do tipo COWORKING podem ter espaços
  const units = await db.unit.findMany({
    where:   { type: "COWORKING" },
    select:  { id: true, name: true },
    orderBy: { name: "asc" },
  });

  return (
    <div className="space-y-6 max-w-lg">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Novo Espaço</h1>
        <p className="text-sm text-gray-500 mt-1">Cadastre uma sala, estação ou espaço de reunião.</p>
      </div>

      <SpaceForm units={units} backHref="/dashboard/admin/spaces" />
    </div>
  );
}

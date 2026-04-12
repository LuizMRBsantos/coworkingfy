import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { AssetForm } from "@/components/shared/AssetForm";
import { ArrowLeft } from "lucide-react";

export default async function NewAssetPage() {
  const session = await auth();
  if (!session) redirect("/login");
  if (session.user.role !== "ADMIN") redirect("/dashboard");

  const [units, spaces] = await Promise.all([
    db.unit.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
    db.space.findMany({
      select: { id: true, name: true, unitId: true, type: true },
      orderBy: { name: "asc" },
    }),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/dashboard/admin/assets">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-1" />
            Voltar
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Novo Ativo</h1>
          <p className="text-sm text-gray-500 mt-0.5">Cadastre um equipamento ou ativo da unidade</p>
        </div>
      </div>

      <div className="max-w-2xl">
        <AssetForm
          units={units}
          spaces={spaces}
          backHref="/dashboard/admin/assets"
        />
      </div>
    </div>
  );
}

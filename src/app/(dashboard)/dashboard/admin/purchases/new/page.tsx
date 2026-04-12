import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { PurchaseForm } from "@/components/shared/PurchaseForm";
import { ArrowLeft } from "lucide-react";

export default async function NewPurchasePage() {
  const session = await auth();
  if (!session) redirect("/login");
  if (session.user.role !== "ADMIN") redirect("/dashboard");

  const units = await db.unit.findMany({
    select:  { id: true, name: true },
    orderBy: { name: "asc" },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/dashboard/admin/purchases">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-1" />
            Voltar
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Nova Compra</h1>
          <p className="text-sm text-gray-500 mt-0.5">Registre uma compra de insumo</p>
        </div>
      </div>

      <div className="max-w-2xl">
        <PurchaseForm units={units} backHref="/dashboard/admin/purchases" />
      </div>
    </div>
  );
}

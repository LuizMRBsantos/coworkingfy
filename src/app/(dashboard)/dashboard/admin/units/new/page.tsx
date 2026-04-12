import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { UnitForm } from "@/components/shared/UnitForm";
import { ArrowLeft } from "lucide-react";

export default async function NewUnitPage() {
  const session = await auth();
  if (!session) redirect("/login");
  if (session.user.role !== "ADMIN") redirect("/dashboard");

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/dashboard/admin/units">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-1" />
            Voltar
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Nova Unidade</h1>
          <p className="text-sm text-gray-500 mt-0.5">Cadastre uma nova unidade no sistema</p>
        </div>
      </div>

      <div className="max-w-md">
        <UnitForm backHref="/dashboard/admin/units" />
      </div>
    </div>
  );
}

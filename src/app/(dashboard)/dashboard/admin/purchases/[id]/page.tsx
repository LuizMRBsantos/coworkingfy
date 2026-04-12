import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PurchaseForm, PURCHASE_CATEGORY_LABEL, PURCHASE_CATEGORY_CLASS } from "@/components/shared/PurchaseForm";
import { ArrowLeft } from "lucide-react";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function PurchaseDetailPage({ params }: PageProps) {
  const session = await auth();
  if (!session) redirect("/login");
  if (session.user.role !== "ADMIN") redirect("/dashboard");

  const { id } = await params;

  const purchase = await db.purchase.findUnique({
    where: { id },
    include: {
      unit:      { select: { id: true, name: true } },
      createdBy: { select: { name: true } },
    },
  });

  if (!purchase) notFound();

  const defaultValues = {
    unitId:      purchase.unitId,
    category:    purchase.category,
    description: purchase.description,
    value:       Number(purchase.value),
    purchasedAt: purchase.purchasedAt.toISOString().slice(0, 10),
    notes:       purchase.notes ?? undefined,
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center gap-4">
        <Link href="/dashboard/admin/purchases">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-1" />
            Voltar
          </Button>
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-xl font-semibold text-gray-900">{purchase.description}</h1>
            <Badge className={`rounded-full text-xs ${PURCHASE_CATEGORY_CLASS[purchase.category]}`}>
              {PURCHASE_CATEGORY_LABEL[purchase.category]}
            </Badge>
          </div>
          <p className="text-sm text-gray-500 mt-0.5">
            {purchase.unit.name} · {new Date(purchase.purchasedAt).toLocaleDateString("pt-BR")} ·{" "}
            <span className="font-semibold text-gray-700">
              {Number(purchase.value).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
            </span>
          </p>
        </div>
      </div>

      <PurchaseForm
        purchaseId={purchase.id}
        defaultValues={defaultValues}
        units={[purchase.unit]}
        backHref="/dashboard/admin/purchases"
      />
    </div>
  );
}

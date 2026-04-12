import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { UnitForm } from "@/components/shared/UnitForm";
import { UnitChecklist } from "@/components/shared/UnitChecklist";
import { getUnitDocumentSignedUrl } from "@/lib/supabase-storage";
import { ArrowLeft, ClipboardCheck } from "lucide-react";

interface PageProps {
  params: Promise<{ id: string }>;
}

const ALL_ITEM_TYPES = [
  "UNIT_CONTRACT",
  "CLEANING_CONTRACT",
  "INTERNET_CONTRACT",
  "EQUIPMENT_INVENTORY",
  "LEASE_CONTRACT",
  "PRINTER_CONTRACT",
] as const;

export default async function EditUnitPage({ params }: PageProps) {
  const session = await auth();
  if (!session) redirect("/login");
  if (session.user.role !== "ADMIN") redirect("/dashboard");

  const { id } = await params;

  const [unit, checklistRows, assetCount] = await Promise.all([
    db.unit.findUnique({ where: { id } }),
    db.unitChecklistItem.findMany({ where: { unitId: id } }),
    db.asset.count({ where: { unitId: id, status: { not: "DECOMMISSIONED" } } }),
  ]);

  if (!unit) notFound();

  // Gerar signed URLs para itens com documento
  const rowsWithUrls = await Promise.all(
    checklistRows.map(async (row) => {
      if (!row.documentUrl) return { ...row, signedUrl: null };
      try {
        const signedUrl = await getUnitDocumentSignedUrl(row.documentUrl);
        return { ...row, signedUrl };
      } catch {
        return { ...row, signedUrl: null };
      }
    }),
  );

  const rowMap = new Map(rowsWithUrls.map((r) => [r.itemType, r]));

  const checklist = ALL_ITEM_TYPES.map((itemType) => {
    const row = rowMap.get(itemType) ?? null;
    const isInventory = itemType === "EQUIPMENT_INVENTORY";
    const isComplete = isInventory
      ? assetCount > 0 || row?.documentUrl != null
      : row?.documentUrl != null;

    return {
      itemType,
      id:          row?.id ?? null,
      documentUrl: row?.documentUrl ?? null,
      fileName:    row?.fileName ?? null,
      uploadedAt:  row?.uploadedAt?.toISOString() ?? null,
      notes:       row?.notes ?? null,
      signedUrl:   row?.signedUrl ?? null,
      isComplete,
      ...(isInventory ? { assetCount } : {}),
    };
  });

  const completedCount = checklist.filter((i) => i.isComplete).length;

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-4">
        <Link href="/dashboard/admin/units">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-1" />
            Voltar
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Editar Unidade</h1>
          <p className="text-sm text-gray-500 mt-0.5">{unit.name}</p>
        </div>
      </div>

      <div className="max-w-md">
        <UnitForm
          unitId={unit.id}
          defaultName={unit.name}
          defaultType={unit.type}
          defaultAddress={unit.address ?? undefined}
          defaultClientName={unit.clientName ?? undefined}
          defaultClientContact={unit.clientContact ?? undefined}
          backHref="/dashboard/admin/units"
        />
      </div>

      {/* Checklist de implantação */}
      <div className="max-w-2xl space-y-3">
        <div className="flex items-center gap-2">
          <ClipboardCheck className="h-5 w-5 text-gray-600" />
          <h2 className="text-lg font-semibold text-gray-900">Checklist de implantação</h2>
        </div>
        <p className="text-sm text-gray-500">
          Contratos e documentos necessários para a operação da unidade.
        </p>
        <UnitChecklist
          unitId={unit.id}
          initialChecklist={checklist}
          initialCompleted={completedCount}
          total={ALL_ITEM_TYPES.length}
          canUpload={true}
        />
      </div>
    </div>
  );
}

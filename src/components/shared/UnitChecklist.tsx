// 'use client' — interativo: upload de arquivos, estado local de loading por item
"use client";

import { useState, useRef } from "react";
import { toast } from "sonner";
import { CheckCircle2, Clock, Upload, ExternalLink, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import type { UnitChecklistItemType } from "@prisma/client";

const ITEM_LABELS: Record<UnitChecklistItemType, string> = {
  UNIT_CONTRACT:       "Contrato da unidade",
  CLEANING_CONTRACT:   "Contrato de limpeza terceirizada",
  INTERNET_CONTRACT:   "Contrato de internet",
  EQUIPMENT_INVENTORY: "Inventário de equipamentos",
  LEASE_CONTRACT:      "Contrato de locação do imóvel",
  PRINTER_CONTRACT:    "Contrato de impressora",
};

export interface ChecklistEntry {
  itemType:    UnitChecklistItemType;
  id:          string | null;
  documentUrl: string | null;
  fileName:    string | null;
  uploadedAt:  string | null;
  notes:       string | null;
  signedUrl:   string | null;
  isComplete:  boolean;
  assetCount?: number;
}

interface UnitChecklistProps {
  unitId:         string;
  initialChecklist: ChecklistEntry[];
  initialCompleted: number;
  total:          number;
  canUpload:      boolean; // false para RECEPTIONIST sem permissão (mas não aplicável aqui)
}

export function UnitChecklist({
  unitId,
  initialChecklist,
  initialCompleted,
  total,
  canUpload,
}: UnitChecklistProps) {
  const [checklist, setChecklist] = useState<ChecklistEntry[]>(initialChecklist);
  const [completed, setCompleted] = useState(initialCompleted);
  const [uploading, setUploading] = useState<UnitChecklistItemType | null>(null);
  const fileRefs = useRef<Partial<Record<UnitChecklistItemType, HTMLInputElement | null>>>({});

  const pct = Math.round((completed / total) * 100);

  async function handleFileChange(
    itemType: UnitChecklistItemType,
    e: React.ChangeEvent<HTMLInputElement>,
  ) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(itemType);
    const fd = new FormData();
    fd.append("itemType", itemType);
    fd.append("file", file);

    const res  = await fetch(`/api/units/${unitId}/checklist`, { method: "POST", body: fd });
    const json = await res.json().catch(() => ({}));
    setUploading(null);

    // Reset input para permitir re-upload do mesmo arquivo
    if (fileRefs.current[itemType]) fileRefs.current[itemType]!.value = "";

    if (!res.ok) {
      toast.error(json.error ?? "Erro ao fazer upload.");
      return;
    }

    // Recarregar checklist atualizado
    const refreshRes = await fetch(`/api/units/${unitId}/checklist`);
    if (refreshRes.ok) {
      const data = await refreshRes.json();
      setChecklist(data.checklist);
      setCompleted(data.completedCount);
    }

    toast.success("Documento atualizado.");
  }

  return (
    <div className="space-y-4">
      {/* Barra de progresso */}
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium text-gray-700">
          {completed}/{total} itens concluídos
        </span>
        <span className={`font-semibold ${pct === 100 ? "text-emerald-600" : "text-amber-600"}`}>
          {pct}%
        </span>
      </div>
      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${pct === 100 ? "bg-emerald-500" : "bg-amber-400"}`}
          style={{ width: `${pct}%` }}
        />
      </div>

      {/* Linhas do checklist */}
      <div className="divide-y divide-gray-100 border border-gray-100 rounded-lg overflow-hidden">
        {checklist.map((item) => {
          const isInventory = item.itemType === "EQUIPMENT_INVENTORY";
          const isLoading   = uploading === item.itemType;

          return (
            <div key={item.itemType} className="flex items-center gap-3 px-4 py-3 bg-white">
              {/* Status icon */}
              {item.isComplete ? (
                <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0" />
              ) : (
                <Clock className="h-5 w-5 text-amber-400 shrink-0" />
              )}

              {/* Label + meta */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-800">
                  {ITEM_LABELS[item.itemType]}
                </p>
                {item.fileName && (
                  <p className="text-xs text-gray-400 truncate">{item.fileName}</p>
                )}
                {isInventory && (
                  <p className="text-xs text-gray-400">
                    {item.assetCount ?? 0} equipamento(s) cadastrado(s)
                  </p>
                )}
              </div>

              {/* Ações */}
              <div className="flex items-center gap-2 shrink-0">
                {isInventory && (
                  <Link href={`/dashboard/admin/assets?unitId=${unitId}`}>
                    <Button variant="outline" size="sm" className="h-7 text-xs gap-1">
                      <Package className="h-3 w-3" />
                      Ver ativos
                    </Button>
                  </Link>
                )}

                {item.signedUrl && (
                  <a href={item.signedUrl} target="_blank" rel="noreferrer">
                    <Button variant="outline" size="sm" className="h-7 text-xs gap-1">
                      <ExternalLink className="h-3 w-3" />
                      Ver
                    </Button>
                  </a>
                )}

                {canUpload && (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 text-xs gap-1"
                      disabled={isLoading}
                      onClick={() => fileRefs.current[item.itemType]?.click()}
                    >
                      <Upload className="h-3 w-3" />
                      {isLoading ? "Enviando..." : item.documentUrl ? "Substituir" : "Upload"}
                    </Button>
                    <input
                      ref={(el) => { fileRefs.current[item.itemType] = el; }}
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png"
                      className="hidden"
                      onChange={(e) => handleFileChange(item.itemType, e)}
                    />
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

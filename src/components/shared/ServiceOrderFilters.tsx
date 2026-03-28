"use client";
// Client Component — usa useRouter e usePathname para atualizar URL via searchParams

import { useRouter, usePathname } from "next/navigation";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const STATUS_OPTIONS = [
  { value: "ALL", label: "Todos os status" },
  { value: "DRAFT", label: "Rascunho" },
  { value: "PENDING_APPROVAL", label: "Aguardando aprovação" },
  { value: "APPROVED", label: "Aprovada" },
  { value: "IN_PROGRESS", label: "Em andamento" },
  { value: "DONE", label: "Concluída" },
  { value: "REJECTED", label: "Rejeitada" },
  { value: "CANCELLED", label: "Cancelada" },
];

interface ServiceOrderFiltersProps {
  units: { id: string; name: string }[];
  currentStatus?: string;
  currentUnitId?: string;
  showUnitFilter?: boolean;
}

export function ServiceOrderFilters({
  units,
  currentStatus,
  currentUnitId,
  showUnitFilter = true,
}: ServiceOrderFiltersProps) {
  const router = useRouter();
  const pathname = usePathname();

  function updateFilter(key: "status" | "unitId", value: string) {
    const params = new URLSearchParams(window.location.search);
    if (value === "ALL") {
      params.delete(key);
    } else {
      params.set(key, value);
    }
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="flex flex-wrap gap-3">
      <Select value={currentStatus ?? "ALL"} onValueChange={(v) => updateFilter("status", v)}>
        <SelectTrigger className="w-52">
          <SelectValue placeholder="Todos os status" />
        </SelectTrigger>
        <SelectContent>
          {STATUS_OPTIONS.map((opt) => (
            <SelectItem key={opt.value} value={opt.value}>
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {showUnitFilter && (
        <Select value={currentUnitId ?? "ALL"} onValueChange={(v) => updateFilter("unitId", v)}>
          <SelectTrigger className="w-52">
            <SelectValue placeholder="Todas as unidades" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Todas as unidades</SelectItem>
            {units.map((unit) => (
              <SelectItem key={unit.id} value={unit.id}>
                {unit.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
    </div>
  );
}

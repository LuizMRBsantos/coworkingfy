// 'use client' — usa useRouter para atualizar URL sem reload de página
"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";

interface MaintenancePlanFiltersProps {
  units:         { id: string; name: string }[];
  currentUnitId: string | undefined;
  currentFreq:   string | undefined;
  currentActive: string | undefined;
}

const FREQUENCIES = [
  { value: "DAILY",         label: "Diário" },
  { value: "WEEKLY",        label: "Semanal" },
  { value: "MONTHLY",       label: "Mensal" },
  { value: "QUARTERLY",     label: "Trimestral" },
  { value: "SEMI_ANNUALLY", label: "Semestral" },
  { value: "ANNUALLY",      label: "Anual" },
];

export function MaintenancePlanFilters({
  units,
  currentUnitId,
  currentFreq,
  currentActive,
}: MaintenancePlanFiltersProps) {
  const router       = useRouter();
  const pathname     = usePathname();
  const searchParams = useSearchParams();

  function updateFilter(key: string, value: string | null) {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("page"); // reset pagination ao filtrar
    if (!value || value === "ALL") {
      params.delete(key);
    } else {
      params.set(key, value);
    }
    router.push(`${pathname}?${params.toString()}`);
  }

  function clearFilters() {
    router.push(pathname);
  }

  const unitValue   = currentUnitId  ?? "ALL";
  const freqValue   = currentFreq    ?? "ALL";
  const activeValue = currentActive  ?? "ALL";

  const selectedUnit = units.find((u) => u.id === unitValue);
  const selectedFreq = FREQUENCIES.find((f) => f.value === freqValue);

  return (
    <div className="flex flex-wrap gap-3">
      {/* Unidade */}
      <Select value={unitValue} onValueChange={(v) => updateFilter("unitId", v)}>
        <SelectTrigger className="w-52">
          <SelectValue>
            {unitValue === "ALL" ? "Todas as unidades" : (selectedUnit?.name ?? "Todas as unidades")}
          </SelectValue>
        </SelectTrigger>
        <SelectContent alignItemWithTrigger={false}>
          <SelectItem value="ALL">Todas as unidades</SelectItem>
          {units.map((u) => (
            <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Frequência */}
      <Select value={freqValue} onValueChange={(v) => updateFilter("frequency", v)}>
        <SelectTrigger className="w-48">
          <SelectValue>
            {freqValue === "ALL" ? "Todas as frequências" : (selectedFreq?.label ?? "Todas as frequências")}
          </SelectValue>
        </SelectTrigger>
        <SelectContent alignItemWithTrigger={false}>
          <SelectItem value="ALL">Todas as frequências</SelectItem>
          {FREQUENCIES.map((f) => (
            <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Status */}
      <Select value={activeValue} onValueChange={(v) => updateFilter("isActive", v)}>
        <SelectTrigger className="w-44">
          <SelectValue>
            {activeValue === "true"  ? "Somente ativos"   :
             activeValue === "false" ? "Somente inativos" :
             "Ativos e inativos"}
          </SelectValue>
        </SelectTrigger>
        <SelectContent alignItemWithTrigger={false}>
          <SelectItem value="ALL">Ativos e inativos</SelectItem>
          <SelectItem value="true">Somente ativos</SelectItem>
          <SelectItem value="false">Somente inativos</SelectItem>
        </SelectContent>
      </Select>

      {/* Limpar */}
      {(unitValue !== "ALL" || freqValue !== "ALL" || activeValue !== "ALL") && (
        <button
          onClick={clearFilters}
          className="text-sm text-gray-500 hover:text-gray-700 underline"
        >
          Limpar filtros
        </button>
      )}
    </div>
  );
}

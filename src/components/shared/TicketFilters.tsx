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

interface TicketFiltersProps {
  units: { id: string; name: string }[];
  currentStatus: string | undefined;
  currentUnitId: string | undefined;
  showUnitFilter: boolean;
}

const TICKET_STATUSES = [
  { value: "OPEN",        label: "Aberto" },
  { value: "IN_PROGRESS", label: "Em andamento" },
  { value: "CLOSED",      label: "Fechado" },
];

export function TicketFilters({
  units,
  currentStatus,
  currentUnitId,
  showUnitFilter,
}: TicketFiltersProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function updateFilter(key: string, value: string | null) {
    const params = new URLSearchParams(searchParams.toString());
    if (!value || value === "ALL") {
      params.delete(key);
    } else {
      params.set(key, value);
    }
    router.push(`${pathname}?${params.toString()}`);
  }

  const statusValue: string = currentStatus ?? "ALL";
  const unitValue: string = currentUnitId ?? "ALL";

  return (
    <div className="flex flex-wrap gap-3">
      <Select value={statusValue} onValueChange={(v) => updateFilter("status", v)}>
        <SelectTrigger className="w-48">
          <SelectValue placeholder="Todos os status" />
        </SelectTrigger>
        <SelectContent alignItemWithTrigger={false}>
          <SelectItem value="ALL">Todos os status</SelectItem>
          {TICKET_STATUSES.map((s) => (
            <SelectItem key={s.value} value={s.value}>
              {s.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {showUnitFilter && (
        <Select value={unitValue} onValueChange={(v) => updateFilter("unitId", v)}>
          <SelectTrigger className="w-56">
            <SelectValue placeholder="Todas as unidades" />
          </SelectTrigger>
          <SelectContent alignItemWithTrigger={false}>
            <SelectItem value="ALL">Todas as unidades</SelectItem>
            {units.map((u) => (
              <SelectItem key={u.id} value={u.id}>
                {u.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
    </div>
  );
}

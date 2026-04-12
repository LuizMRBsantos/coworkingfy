// 'use client' — componente interativo com links e estados de execução
"use client";

import Link from "next/link";
import { CheckCircle2, XCircle, Circle, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { ServiceOrderStatus } from "@prisma/client";

export interface TimelineEntry {
  expectedDate: string; // ISO string
  os?: {
    id:     string;
    number: string;
    status: ServiceOrderStatus;
  };
}

interface PlanExecutionTimelineProps {
  entries: TimelineEntry[];
}

const OS_STATUS_LABEL: Partial<Record<ServiceOrderStatus, string>> = {
  DRAFT:            "Rascunho",
  PENDING_APPROVAL: "Aguardando",
  APPROVED:         "Aprovada",
  IN_PROGRESS:      "Em andamento",
  DONE:             "Concluída",
  VALIDATED:        "Validada",
  REJECTED:         "Rejeitada",
  CANCELLED:        "Cancelada",
};

const OS_STATUS_CLASS: Partial<Record<ServiceOrderStatus, string>> = {
  DRAFT:            "bg-slate-100 text-slate-700 border-none",
  PENDING_APPROVAL: "bg-amber-100 text-amber-700 border-none",
  APPROVED:         "bg-blue-100 text-blue-700 border-none",
  IN_PROGRESS:      "bg-purple-100 text-purple-700 border-none",
  DONE:             "bg-emerald-100 text-emerald-700 border-none",
  VALIDATED:        "bg-teal-100 text-teal-700 border-none",
  REJECTED:         "bg-rose-100 text-rose-700 border-none",
  CANCELLED:        "bg-gray-100 text-gray-500 border-none",
};

function entryState(entry: TimelineEntry): "done" | "failed" | "upcoming" | "pending" {
  if (!entry.os) {
    const date = new Date(entry.expectedDate);
    return date < new Date() ? "failed" : "upcoming";
  }
  const { status } = entry.os;
  if (status === "DONE" || status === "VALIDATED") return "done";
  if (status === "CANCELLED" || status === "REJECTED") return "failed";
  return "pending";
}

export function PlanExecutionTimeline({ entries }: PlanExecutionTimelineProps) {
  if (entries.length === 0) {
    return <p className="text-xs text-gray-400">Nenhuma execução registrada ainda.</p>;
  }

  return (
    <ul className="space-y-0">
      {entries.map((entry, i) => {
        const state = entryState(entry);
        const date  = new Date(entry.expectedDate).toLocaleDateString("pt-BR");

        return (
          <li key={i} className="flex items-start gap-3 py-2.5 border-b border-gray-50 last:border-b-0">
            {/* Icon */}
            <div className="mt-0.5 shrink-0">
              {state === "done"     && <CheckCircle2 className="h-4 w-4 text-emerald-500" />}
              {state === "failed"   && <XCircle className="h-4 w-4 text-red-400" />}
              {state === "pending"  && <Clock className="h-4 w-4 text-amber-400" />}
              {state === "upcoming" && <Circle className="h-4 w-4 text-gray-300" />}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <p className="text-xs text-gray-400">{date}</p>
              {entry.os ? (
                <div className="flex items-center gap-2 mt-0.5">
                  <Link
                    href={`/dashboard/admin/service-orders/${entry.os.id}`}
                    className="text-sm font-mono font-semibold text-gray-700 hover:underline"
                  >
                    {entry.os.number}
                  </Link>
                  <Badge className={`text-[10px] rounded-full ${OS_STATUS_CLASS[entry.os.status] ?? ""}`}>
                    {OS_STATUS_LABEL[entry.os.status] ?? entry.os.status}
                  </Badge>
                </div>
              ) : (
                <p className={`text-xs mt-0.5 ${state === "failed" ? "text-red-500 font-medium" : "text-gray-400"}`}>
                  {state === "failed" ? "Não executada" : "Prevista"}
                </p>
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
}

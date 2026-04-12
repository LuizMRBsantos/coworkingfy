// 'use client' — busca logs de atividade via fetch e renderiza timeline dinâmica
"use client";

import { useEffect, useState } from "react";
import { History, MapPin } from "lucide-react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ActivityLogEntry {
  id:              string;
  action:          string;
  fromStatus:      string | null;
  toStatus:        string | null;
  performedByName: string | null;
  lat:             unknown;
  lng:             unknown;
  createdAt:       string;
}

export type ActivityEntityType = "SERVICE_ORDER" | "TICKET";

interface ActivityTimelineProps {
  entityType: ActivityEntityType;
  entityId:   string;
}

// ---------------------------------------------------------------------------
// Label + color maps
// ---------------------------------------------------------------------------

const OS_STATUS_LABEL: Record<string, string> = {
  PENDING_APPROVAL: "Enviado para aprovação",
  APPROVED:         "OS aprovada",
  REJECTED:         "OS rejeitada",
  IN_PROGRESS:      "Execução iniciada",
  DONE:             "Execução concluída",
  VALIDATED:        "OS validada pelo gestor",
  CANCELLED:        "OS cancelada",
};

const TICKET_STATUS_LABEL: Record<string, string> = {
  IN_PROGRESS:   "Atendimento iniciado",
  PENDING_CLOSE: "Fechamento solicitado",
  CLOSED:        "Ticket fechado",
};

type DotColor = "yellow" | "green" | "red" | "gray" | "blue";

const OS_STATUS_COLOR: Record<string, DotColor> = {
  PENDING_APPROVAL: "yellow",
  APPROVED:         "blue",
  REJECTED:         "red",
  IN_PROGRESS:      "gray",
  DONE:             "green",
  VALIDATED:        "green",
  CANCELLED:        "red",
};

const TICKET_STATUS_COLOR: Record<string, DotColor> = {
  IN_PROGRESS:   "yellow",
  PENDING_CLOSE: "blue",
  CLOSED:        "green",
};

const DOT_CLASS: Record<DotColor, string> = {
  yellow: "bg-amber-400",
  green:  "bg-emerald-500",
  red:    "bg-red-500",
  gray:   "bg-gray-300",
  blue:   "bg-blue-500",
};

function getEventLabel(entityType: ActivityEntityType, log: ActivityLogEntry): string {
  if (log.action === "STATUS_CHANGED" && log.toStatus) {
    const map = entityType === "SERVICE_ORDER" ? OS_STATUS_LABEL : TICKET_STATUS_LABEL;
    return map[log.toStatus] ?? `Status alterado: ${log.toStatus}`;
  }
  return log.action;
}

function getDotColor(entityType: ActivityEntityType, log: ActivityLogEntry): DotColor {
  if (log.action === "STATUS_CHANGED" && log.toStatus) {
    const map = entityType === "SERVICE_ORDER" ? OS_STATUS_COLOR : TICKET_STATUS_COLOR;
    return map[log.toStatus] ?? "gray";
  }
  return "gray";
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function fmt(d: string): string {
  return new Date(d).toLocaleDateString("pt-BR", {
    day:    "2-digit",
    month:  "2-digit",
    year:   "numeric",
    hour:   "2-digit",
    minute: "2-digit",
  });
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ActivityTimeline({ entityType, entityId }: ActivityTimelineProps) {
  const [logs, setLogs]       = useState<ActivityLogEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/activity-logs?entityType=${entityType}&entityId=${entityId}`)
      .then((r) => r.json())
      .then((json: { data?: ActivityLogEntry[] }) => setLogs(json.data ?? []))
      .catch(() => setLogs([]))
      .finally(() => setLoading(false));
  }, [entityType, entityId]);

  return (
    <div>
      <p className="text-xs text-gray-400 uppercase tracking-wide mb-4 flex items-center gap-1">
        <History className="h-3.5 w-3.5" /> Linha do tempo
      </p>

      {loading ? (
        <div className="space-y-3 animate-pulse">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-start gap-3">
              <div className="mt-1.5 h-2.5 w-2.5 rounded-full bg-gray-200 shrink-0" />
              <div className="flex-1 space-y-1.5">
                <div className="h-3.5 bg-gray-200 rounded w-40" />
                <div className="h-3 bg-gray-100 rounded w-24" />
              </div>
            </div>
          ))}
        </div>
      ) : logs.length === 0 ? (
        <p className="text-sm text-gray-400">Nenhum evento registrado ainda.</p>
      ) : (
        <ul className="space-y-3 pl-1">
          {logs.map((log) => {
            const color   = getDotColor(entityType, log);
            const hasGps  = log.lat != null && log.lng != null;
            return (
              <li key={log.id} className="flex items-start gap-3">
                <span className={`mt-1.5 h-2.5 w-2.5 rounded-full shrink-0 ${DOT_CLASS[color]}`} />
                <div>
                  <p className="text-sm text-gray-800">{getEventLabel(entityType, log)}</p>
                  <div className="flex flex-wrap items-center gap-x-2 mt-0.5">
                    <p className="text-xs text-gray-400">{fmt(log.createdAt)}</p>
                    {log.performedByName && (
                      <p className="text-xs text-gray-500">por {log.performedByName}</p>
                    )}
                    {hasGps && (
                      <span className="inline-flex items-center gap-0.5 text-xs text-emerald-600">
                        <MapPin className="h-3 w-3" /> GPS verificado
                      </span>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

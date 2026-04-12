import Link from "next/link";
import { Clock, Wrench, AlertTriangle } from "lucide-react";
import type { HealthScore } from "@/lib/healthScore";

interface UnitHealthCardProps {
  unitId:   string;
  unitName: string;
  health:   HealthScore;
}

const BAND_ACCENT: Record<HealthScore["band"], string> = {
  green:  "border-t-emerald-400",
  yellow: "border-t-amber-400",
  red:    "border-t-red-500",
  none:   "border-t-gray-300",
};

const BAND_SCORE_COLOR: Record<HealthScore["band"], string> = {
  green:  "text-emerald-600",
  yellow: "text-amber-500",
  red:    "text-red-600",
  none:   "text-gray-400",
};

const BAND_BAR: Record<HealthScore["band"], string> = {
  green:  "bg-emerald-400",
  yellow: "bg-amber-400",
  red:    "bg-red-500",
  none:   "bg-gray-200",
};

const BAND_BG: Record<HealthScore["band"], string> = {
  green:  "bg-emerald-50/40",
  yellow: "bg-amber-50/40",
  red:    "bg-red-50/40",
  none:   "bg-gray-50",
};

export function UnitHealthCard({ unitId, unitName, health }: UnitHealthCardProps) {
  const hasIssues = health.urgentOpen > 0 || health.highOpen > 0 || health.slaBreached > 0 || health.pmocOverdue > 0;

  return (
    <Link href={`/dashboard/admin/overview/${unitId}`}>
      <div className={`
        rounded-xl border border-t-4 ${BAND_ACCENT[health.band]} ${BAND_BG[health.band]}
        hover:shadow-md transition-all duration-150 cursor-pointer h-full
        border-gray-100
      `}>
        <div className="p-3.5 flex flex-col gap-2.5 h-full">
          {/* Nome + score */}
          <div className="flex items-start justify-between gap-2">
            <p className="text-xs font-semibold text-gray-800 leading-snug line-clamp-2">{unitName}</p>
            <p className={`text-2xl font-bold leading-none tabular-nums shrink-0 ${BAND_SCORE_COLOR[health.band]}`}>
              {health.band === "none" ? "—" : health.score}
            </p>
          </div>

          {/* Barra */}
          <div className="h-1 bg-gray-200 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full ${BAND_BAR[health.band]}`}
              style={{ width: `${health.band === "none" ? 0 : health.score}%` }}
            />
          </div>

          {/* Indicadores */}
          <div className="flex flex-wrap gap-1 mt-auto">
            {health.urgentOpen > 0 && (
              <span className="inline-flex items-center gap-0.5 rounded-full bg-red-100 text-red-700 text-[10px] font-semibold px-1.5 py-0.5">
                <AlertTriangle className="h-2.5 w-2.5 shrink-0" />
                {health.urgentOpen} Crítico{health.urgentOpen > 1 ? "s" : ""}
              </span>
            )}
            {health.highOpen > 0 && (
              <span className="inline-flex items-center gap-0.5 rounded-full bg-orange-100 text-orange-700 text-[10px] font-semibold px-1.5 py-0.5">
                <span className="h-1.5 w-1.5 rounded-full bg-orange-400 shrink-0" />
                {health.highOpen} Alta{health.highOpen > 1 ? "s" : ""}
              </span>
            )}
            {health.slaBreached > 0 && (
              <span className="inline-flex items-center gap-0.5 rounded-full bg-purple-100 text-purple-700 text-[10px] font-semibold px-1.5 py-0.5">
                <Clock className="h-2.5 w-2.5 shrink-0" />
                {health.slaBreached} SLA
              </span>
            )}
            {health.pmocOverdue > 0 && (
              <span className="inline-flex items-center gap-0.5 rounded-full bg-amber-100 text-amber-700 text-[10px] font-semibold px-1.5 py-0.5">
                <Wrench className="h-2.5 w-2.5 shrink-0" />
                {health.pmocOverdue} PMOC
              </span>
            )}
            {!hasIssues && (
              <span className="text-[10px] text-emerald-600 font-medium">✓ Em dia</span>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}

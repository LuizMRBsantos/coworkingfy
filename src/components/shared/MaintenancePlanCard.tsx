import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { AlertTriangle, CheckCircle2, Clock, Package, Building2 } from "lucide-react";
import type { PlanFrequency, Priority, ServiceType } from "@prisma/client";

// ---------------------------------------------------------------------------
// Labels exportados — reutilizados em formulários e páginas
// ---------------------------------------------------------------------------

export const PLAN_FREQUENCY_LABEL: Record<PlanFrequency, string> = {
  DAILY:          "Diário",
  WEEKLY:         "Semanal",
  MONTHLY:        "Mensal",
  QUARTERLY:      "Trimestral",
  SEMI_ANNUALLY:  "Semestral",
  ANNUALLY:       "Anual",
};

export const PLAN_SERVICE_TYPE_LABEL: Record<ServiceType, string> = {
  CLEANING:   "Limpeza",
  ELECTRICAL: "Elétrica",
  HYDRAULIC:  "Hidráulica",
  OTHER:      "Outro",
};

export const PLAN_PRIORITY_LABEL: Record<Priority, string> = {
  URGENT: "Crítica",
  HIGH:   "Alta",
  MEDIUM: "Média",
  LOW:    "Baixa",
};

const PRIORITY_CLASS: Record<Priority, string> = {
  URGENT: "bg-red-100 text-red-700 border-none",
  HIGH:   "bg-orange-100 text-orange-700 border-none",
  MEDIUM: "bg-blue-100 text-blue-700 border-none",
  LOW:    "bg-gray-100 text-gray-600 border-none",
};

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface MaintenancePlanCardProps {
  plan: {
    id:          string;
    name:        string;
    frequency:   PlanFrequency;
    serviceType: ServiceType;
    priority:    Priority;
    isActive:    boolean;
    nextRunAt:   Date | string;
    lastRunAt:   Date | string | null;
    unit:        { id: string; name: string };
    asset:       { id: string; name: string; code: string } | null;
    space:       { id: string; name: string } | null;
    _count:      { serviceOrders: number };
  };
  href?: string;
}

export function MaintenancePlanCard({ plan, href }: MaintenancePlanCardProps) {
  const nextRun  = new Date(plan.nextRunAt);
  const now      = new Date();
  const overdue  = nextRun < now;
  const soon     = !overdue && nextRun.getTime() - now.getTime() < 7 * 24 * 60 * 60 * 1000;

  const daysLabel = (() => {
    const diff = Math.ceil((nextRun.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    if (overdue) return `Vencido há ${Math.abs(diff)}d`;
    if (diff === 0) return "Hoje";
    if (diff === 1) return "Amanhã";
    return `Em ${diff}d`;
  })();

  const card = (
    <Card className={`border transition-colors ${!plan.isActive ? "opacity-60" : ""} ${href ? "hover:border-gray-300 cursor-pointer" : ""}`}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            {/* Nome + badges */}
            <div className="flex flex-wrap items-center gap-1.5 mb-1">
              <span className="text-sm font-semibold text-gray-900 truncate">{plan.name}</span>
              {!plan.isActive && (
                <Badge className="bg-gray-200 text-gray-500 border-none text-xs">Inativo</Badge>
              )}
            </div>

            {/* Frequência + tipo */}
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <Badge className={`${PRIORITY_CLASS[plan.priority]} text-xs`}>
                {PLAN_PRIORITY_LABEL[plan.priority]}
              </Badge>
              <span className="text-xs text-gray-500">{PLAN_FREQUENCY_LABEL[plan.frequency]}</span>
              <span className="text-gray-300 text-xs">·</span>
              <span className="text-xs text-gray-500">{PLAN_SERVICE_TYPE_LABEL[plan.serviceType]}</span>
            </div>

            {/* Contexto: unidade / ativo / espaço */}
            <div className="flex flex-wrap items-center gap-3 text-xs text-gray-400">
              <span className="flex items-center gap-1">
                <Building2 className="h-3 w-3" />
                {plan.unit.name}
              </span>
              {plan.asset && (
                <span className="flex items-center gap-1">
                  <Package className="h-3 w-3" />
                  {plan.asset.code} — {plan.asset.name}
                </span>
              )}
            </div>
          </div>

          {/* Indicador de prazo */}
          <div className={`shrink-0 flex flex-col items-end gap-1 text-right`}>
            <div className={`flex items-center gap-1 text-xs font-medium ${overdue ? "text-red-600" : soon ? "text-amber-600" : "text-emerald-600"}`}>
              {overdue
                ? <AlertTriangle className="h-3.5 w-3.5" />
                : soon
                ? <Clock className="h-3.5 w-3.5" />
                : <CheckCircle2 className="h-3.5 w-3.5" />
              }
              {daysLabel}
            </div>
            <p className="text-xs text-gray-400">
              {nextRun.toLocaleDateString("pt-BR")}
            </p>
            <p className="text-xs text-gray-400">{plan._count.serviceOrders} OS</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  if (href) return <Link href={href}>{card}</Link>;
  return card;
}

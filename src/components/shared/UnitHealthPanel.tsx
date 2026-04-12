import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  AlertTriangle, CheckCircle2, Clock, Wrench,
  FileText, ClipboardList, ArrowRight,
} from "lucide-react";
import type { Priority, ServiceOrderStatus, TicketStatus, PlanFrequency } from "@prisma/client";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface PanelTicket {
  id:       string;
  number:   string;
  description: string;
  priority: Priority;
  status:   TicketStatus;
}

interface PanelServiceOrder {
  id:                    string;
  number:                string;
  status:                ServiceOrderStatus;
  slaResolutionDeadline: Date | null;
  slaAttendanceDeadline: Date | null;
  startedAt:             Date | null;
}

interface PanelPlan {
  id:        string;
  name:      string;
  nextRunAt: Date;
  frequency: PlanFrequency;
  isActive:  boolean;
}

export interface UnitHealthPanelProps {
  unitId:          string;
  unitName:        string;
  tickets:         PanelTicket[];
  serviceOrders:   PanelServiceOrder[];
  maintenancePlans: PanelPlan[];
}

// ---------------------------------------------------------------------------
// Labels
// ---------------------------------------------------------------------------

const PRIORITY_LABEL: Record<Priority, string> = {
  URGENT: "Crítico", HIGH: "Alta", MEDIUM: "Média", LOW: "Baixa",
};
const PRIORITY_CLASS: Record<Priority, string> = {
  URGENT: "bg-red-100 text-red-700 border-none",
  HIGH:   "bg-orange-100 text-orange-700 border-none",
  MEDIUM: "bg-blue-100 text-blue-700 border-none",
  LOW:    "bg-gray-100 text-gray-600 border-none",
};
const OS_STATUS_LABEL: Record<ServiceOrderStatus, string> = {
  DRAFT:            "Rascunho",
  PENDING_APPROVAL: "Aguard. aprovação",
  APPROVED:         "Aprovada",
  IN_PROGRESS:      "Em andamento",
  DONE:             "Concluída",
  VALIDATED:        "Validada",
  REJECTED:         "Rejeitada",
  CANCELLED:        "Cancelada",
};
const OS_STATUS_CLASS: Record<ServiceOrderStatus, string> = {
  DRAFT:            "bg-slate-100 text-slate-700 border-none",
  PENDING_APPROVAL: "bg-amber-100 text-amber-700 border-none",
  APPROVED:         "bg-blue-100 text-blue-700 border-none",
  IN_PROGRESS:      "bg-purple-100 text-purple-700 border-none",
  DONE:             "bg-emerald-100 text-emerald-700 border-none",
  VALIDATED:        "bg-teal-100 text-teal-700 border-none",
  REJECTED:         "bg-rose-100 text-rose-700 border-none",
  CANCELLED:        "bg-gray-100 text-gray-500 border-none",
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function slaStatus(os: PanelServiceOrder): "ok" | "attention" | "breached" {
  const now = new Date();
  if (os.slaResolutionDeadline && os.slaResolutionDeadline < now) return "breached";
  if (os.slaAttendanceDeadline && os.slaAttendanceDeadline < now && !os.startedAt) return "attention";
  if (
    os.slaResolutionDeadline &&
    os.slaResolutionDeadline.getTime() - now.getTime() < 4 * 60 * 60 * 1000
  ) return "attention";
  return "ok";
}

function planStatus(plan: PanelPlan): "overdue" | "soon" | "ok" {
  const now  = new Date();
  const in7d = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  if (plan.nextRunAt < now)    return "overdue";
  if (plan.nextRunAt <= in7d)  return "soon";
  return "ok";
}

function fmtDate(d: Date | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("pt-BR");
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function UnitHealthPanel({
  unitId, unitName, tickets, serviceOrders, maintenancePlans,
}: UnitHealthPanelProps) {
  const openTickets   = tickets.filter((t) => t.status !== "CLOSED");
  const activeOrders  = serviceOrders.filter(
    (o) => ["DRAFT","PENDING_APPROVAL","APPROVED","IN_PROGRESS"].includes(o.status),
  );
  const overduePlans  = maintenancePlans.filter((p) => p.isActive && planStatus(p) === "overdue");
  const soonPlans     = maintenancePlans.filter((p) => p.isActive && planStatus(p) === "soon");

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold text-gray-900">{unitName}</h2>
        <Link
          href={`/dashboard/admin/tickets?unitId=${unitId}`}
          className="text-xs text-gray-400 hover:text-gray-600 flex items-center gap-1"
        >
          Ver detalhes <ArrowRight className="h-3 w-3" />
        </Link>
      </div>

      {/* Tickets abertos */}
      <div>
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 flex items-center gap-1">
          <FileText className="h-3.5 w-3.5" /> Tickets abertos ({openTickets.length})
        </p>
        {openTickets.length === 0 ? (
          <p className="text-xs text-gray-400 flex items-center gap-1">
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" /> Nenhum ticket aberto
          </p>
        ) : (
          <div className="space-y-1.5">
            {openTickets.map((t) => (
              <Link
                key={t.id}
                href={`/dashboard/admin/tickets/${t.id}`}
                className="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <Badge className={`shrink-0 text-xs rounded-full ${PRIORITY_CLASS[t.priority]}`}>
                  {PRIORITY_LABEL[t.priority]}
                </Badge>
                <span className="text-xs text-gray-700 truncate">{t.description}</span>
                <span className="text-xs font-mono text-gray-400 ml-auto shrink-0">{t.number}</span>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* OS ativas */}
      <div>
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 flex items-center gap-1">
          <ClipboardList className="h-3.5 w-3.5" /> OS ativas com SLA ({activeOrders.length})
        </p>
        {activeOrders.length === 0 ? (
          <p className="text-xs text-gray-400 flex items-center gap-1">
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" /> Sem OS ativas
          </p>
        ) : (
          <div className="space-y-1.5">
            {activeOrders.map((os) => {
              const st = slaStatus(os);
              return (
                <Link
                  key={os.id}
                  href={`/dashboard/admin/service-orders/${os.id}`}
                  className="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  {st === "breached"  && <AlertTriangle className="h-3.5 w-3.5 text-red-500 shrink-0" />}
                  {st === "attention" && <Clock          className="h-3.5 w-3.5 text-amber-500 shrink-0" />}
                  {st === "ok"        && <CheckCircle2   className="h-3.5 w-3.5 text-emerald-500 shrink-0" />}
                  <span className="text-xs font-mono text-gray-700">{os.number}</span>
                  <Badge className={`text-xs rounded-full ml-1 ${OS_STATUS_CLASS[os.status]}`}>
                    {OS_STATUS_LABEL[os.status]}
                  </Badge>
                  {os.slaResolutionDeadline && (
                    <span className={`text-xs ml-auto shrink-0 ${st === "breached" ? "text-red-600 font-medium" : "text-gray-400"}`}>
                      {st === "breached" ? "Venceu " : "Vence "}{fmtDate(os.slaResolutionDeadline)}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        )}
      </div>

      {/* PMOC vencidos/próximos */}
      <div>
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 flex items-center gap-1">
          <Wrench className="h-3.5 w-3.5" /> PMOC — próximas manutenções
        </p>
        {overduePlans.length === 0 && soonPlans.length === 0 ? (
          <p className="text-xs text-gray-400 flex items-center gap-1">
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" /> Tudo em dia
          </p>
        ) : (
          <div className="space-y-1.5">
            {[...overduePlans, ...soonPlans].map((plan) => {
              const st = planStatus(plan);
              return (
                <Link
                  key={plan.id}
                  href={`/dashboard/admin/maintenance-plans/${plan.id}`}
                  className="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  {st === "overdue"
                    ? <AlertTriangle className="h-3.5 w-3.5 text-red-500 shrink-0" />
                    : <Clock         className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                  }
                  <span className="text-xs text-gray-700 truncate">{plan.name}</span>
                  <span className={`text-xs ml-auto shrink-0 font-medium ${st === "overdue" ? "text-red-600" : "text-amber-600"}`}>
                    {fmtDate(plan.nextRunAt)}
                  </span>
                </Link>
              );
            })}
          </div>
        )}
      </div>

      {/* Próximas 30 dias */}
      {(() => {
        const in30 = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
        const upcoming = maintenancePlans.filter(
          (p) => p.isActive && planStatus(p) === "ok" && p.nextRunAt <= in30,
        );
        if (upcoming.length === 0) return null;
        return (
          <Card className="bg-gray-50 border-gray-100">
            <CardContent className="pt-4 pb-4">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                Próximas manutenções (30 dias)
              </p>
              <div className="space-y-1">
                {upcoming.map((p) => (
                  <div key={p.id} className="flex items-center justify-between text-xs">
                    <span className="text-gray-600 truncate">{p.name}</span>
                    <span className="text-gray-400 shrink-0 ml-2">{fmtDate(p.nextRunAt)}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        );
      })()}
    </div>
  );
}

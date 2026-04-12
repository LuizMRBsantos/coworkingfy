import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Building2, Calendar, User, Wrench, AlertCircle, DollarSign, CheckCircle2, Clock } from "lucide-react";
import type { Prisma, ProviderType, ServiceOrderStatus, ServiceType } from "@prisma/client";

interface ServiceOrderCardProps {
  serviceOrder: {
    id:                    string;
    number:                string;
    status:                ServiceOrderStatus;
    serviceType:           ServiceType;
    description:           string;
    createdAt:             Date;
    startedAt:             Date | null;
    slaAttendanceDeadline: Date | null;
    slaResolutionDeadline: Date | null;
    value:                 Prisma.Decimal | null;
    unit:      { id: string; name: string };
    createdBy: { id: string; name: string | null };
    provider:  { id: string; name: string; type: ProviderType } | null;
  };
}

const STATUS_LABEL: Record<ServiceOrderStatus, string> = {
  DRAFT:            "Rascunho",
  PENDING_APPROVAL: "Aguardando aprovação",
  APPROVED:         "Aprovada",
  IN_PROGRESS:      "Em andamento",
  DONE:             "Concluída",
  VALIDATED:        "Validada",
  REJECTED:         "Rejeitada",
  CANCELLED:        "Cancelada",
};

const STATUS_CLASS: Record<ServiceOrderStatus, string> = {
  DRAFT:            "bg-slate-100 text-slate-700 hover:bg-slate-200 border-none",
  PENDING_APPROVAL: "bg-amber-100 text-amber-700 hover:bg-amber-200 border-none",
  APPROVED:         "bg-blue-100 text-blue-700 hover:bg-blue-200 border-none",
  IN_PROGRESS:      "bg-purple-100 text-purple-700 hover:bg-purple-200 border-none",
  DONE:             "bg-emerald-100 text-emerald-700 hover:bg-emerald-200 border-none",
  VALIDATED:        "bg-teal-100 text-teal-700 hover:bg-teal-200 border-none",
  REJECTED:         "bg-rose-100 text-rose-700 hover:bg-rose-200 border-none",
  CANCELLED:        "bg-gray-100 text-gray-500 hover:bg-gray-200 border-none",
};

const SERVICE_TYPE_LABEL: Record<ServiceType, string> = {
  CLEANING:   "Limpeza",
  ELECTRICAL: "Elétrica",
  HYDRAULIC:  "Hidráulica",
  OTHER:      "Outro",
};

type SlaState = "ok" | "warning" | "overdue";

function getSlaState(deadline: Date | null, resolved: boolean): SlaState | null {
  if (resolved || !deadline) return null;
  const diff = new Date(deadline).getTime() - Date.now();
  if (diff < 0) return "overdue";
  if (diff < 2 * 60 * 60 * 1000) return "warning";
  return "ok";
}

export function ServiceOrderCard({ serviceOrder: os }: ServiceOrderCardProps) {
  const isFinished = ["DONE", "VALIDATED", "CANCELLED", "REJECTED"].includes(os.status);

  const attendanceState = getSlaState(
    os.slaAttendanceDeadline ? new Date(os.slaAttendanceDeadline) : null,
    !!os.startedAt,
  );
  const resolutionState = getSlaState(
    os.slaResolutionDeadline ? new Date(os.slaResolutionDeadline) : null,
    isFinished,
  );

  const hasOverdue = attendanceState === "overdue" || resolutionState === "overdue";
  const hasWarning = !hasOverdue && (attendanceState === "warning" || resolutionState === "warning");

  return (
    <Link href={`/dashboard/admin/service-orders/${os.id}`} className="block">
      <Card className={`hover:border-gray-300 transition-colors cursor-pointer shadow-sm ${
        hasOverdue ? "border-red-300 bg-red-50/10" : hasWarning ? "border-amber-200" : "border-gray-200"
      }`}>
        <CardContent className="p-5">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              {/* Número e badges */}
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <span className="font-mono text-sm font-semibold text-gray-900">{os.number}</span>
                <Badge className={`font-medium rounded-full ${STATUS_CLASS[os.status]}`}>
                  {STATUS_LABEL[os.status]}
                </Badge>
                {hasOverdue && (
                  <span className="flex items-center gap-1 text-xs text-red-600 font-medium">
                    <AlertCircle className="h-3.5 w-3.5" />
                    SLA vencido
                  </span>
                )}
                {hasWarning && (
                  <span className="flex items-center gap-1 text-xs text-amber-600 font-medium">
                    <Clock className="h-3.5 w-3.5" />
                    SLA próximo
                  </span>
                )}
              </div>

              {/* Tipo e descrição */}
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                {SERVICE_TYPE_LABEL[os.serviceType]}
              </p>
              <p className="text-sm text-gray-700 line-clamp-2">{os.description}</p>

              {/* Metadados */}
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-3 text-xs text-gray-500">
                <span className="flex items-center gap-1">
                  <Building2 className="h-3.5 w-3.5" />
                  {os.unit.name}
                </span>
                <span className="flex items-center gap-1">
                  <User className="h-3.5 w-3.5" />
                  {os.createdBy.name}
                </span>
                {os.provider && (
                  <span className="flex items-center gap-1">
                    <Wrench className="h-3.5 w-3.5" />
                    {os.provider.name}
                  </span>
                )}
                <span className="flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5" />
                  {new Date(os.createdAt).toLocaleDateString("pt-BR")}
                </span>
                {os.value && (
                  <span className="flex items-center gap-1">
                    <DollarSign className="h-3.5 w-3.5" />
                    {Number(os.value).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                  </span>
                )}
              </div>
            </div>

            {/* SLA indicators — coluna direita */}
            {!isFinished && (os.slaAttendanceDeadline || os.slaResolutionDeadline) && (
              <div className="shrink-0 text-right space-y-1">
                {os.slaAttendanceDeadline && !os.startedAt && (
                  <div className={`text-xs ${attendanceState === "overdue" ? "text-red-600 font-medium" : attendanceState === "warning" ? "text-amber-500" : "text-gray-400"}`}>
                    {attendanceState === "overdue"
                      ? <span className="flex items-center gap-1 justify-end"><AlertCircle className="h-3 w-3" />Atend. vencido</span>
                      : <span className="flex items-center gap-1 justify-end"><CheckCircle2 className="h-3 w-3" />Atend. ok</span>
                    }
                  </div>
                )}
                {os.slaResolutionDeadline && (
                  <div className={`text-xs ${resolutionState === "overdue" ? "text-red-600 font-medium" : resolutionState === "warning" ? "text-amber-500" : "text-gray-400"}`}>
                    {resolutionState === "overdue"
                      ? <span className="flex items-center gap-1 justify-end"><AlertCircle className="h-3 w-3" />Res. vencido</span>
                      : <span className="flex items-center gap-1 justify-end"><CheckCircle2 className="h-3 w-3" />Res. ok</span>
                    }
                  </div>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

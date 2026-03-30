import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Building2, Calendar, User, Wrench, AlertCircle, DollarSign } from "lucide-react";
import type { Prisma, ProviderType, ServiceOrderStatus, ServiceType } from "@prisma/client";

interface ServiceOrderCardProps {
  serviceOrder: {
    id: string;
    number: string;
    status: ServiceOrderStatus;
    serviceType: ServiceType;
    description: string;
    createdAt: Date;
    slaDeadline: Date | null;
    value: Prisma.Decimal | null;
    unit: { id: string; name: string };
    createdBy: { id: string; name: string | null };
    provider: { id: string; name: string; type: ProviderType } | null;
  };
}

const STATUS_LABEL: Record<ServiceOrderStatus, string> = {
  DRAFT: "Rascunho",
  PENDING_APPROVAL: "Aguardando aprovação",
  APPROVED: "Aprovada",
  IN_PROGRESS: "Em andamento",
  DONE: "Concluída",
  REJECTED: "Rejeitada",
  CANCELLED: "Cancelada",
};

const STATUS_CLASS: Record<ServiceOrderStatus, string> = {
  DRAFT: "bg-gray-100 text-gray-700 hover:bg-gray-100",
  PENDING_APPROVAL: "bg-yellow-100 text-yellow-800 hover:bg-yellow-100",
  APPROVED: "bg-blue-100 text-blue-800 hover:bg-blue-100",
  IN_PROGRESS: "bg-purple-100 text-purple-800 hover:bg-purple-100",
  DONE: "bg-green-100 text-green-800 hover:bg-green-100",
  REJECTED: "bg-red-100 text-red-800 hover:bg-red-100",
  CANCELLED: "bg-gray-200 text-gray-600 hover:bg-gray-200",
};

const SERVICE_TYPE_LABEL: Record<ServiceType, string> = {
  CLEANING: "Limpeza",
  ELECTRICAL: "Elétrica",
  HYDRAULIC: "Hidráulica",
  OTHER: "Outro",
};

export function ServiceOrderCard({ serviceOrder: os }: ServiceOrderCardProps) {
  const isOverdue =
    os.slaDeadline &&
    new Date(os.slaDeadline) < new Date() &&
    os.status !== "DONE" &&
    os.status !== "CANCELLED";

  return (
    <Card className={isOverdue ? "border-red-300 bg-red-50/30" : ""}>
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            {/* Número e badges */}
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <span className="font-mono text-sm font-semibold text-gray-900">{os.number}</span>
              <Badge className={STATUS_CLASS[os.status]}>{STATUS_LABEL[os.status]}</Badge>
              {isOverdue && (
                <span className="flex items-center gap-1 text-xs text-red-600 font-medium">
                  <AlertCircle className="h-3.5 w-3.5" />
                  SLA vencido
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
                  {Number(os.value).toLocaleString("pt-BR", {
                    style: "currency",
                    currency: "BRL",
                  })}
                </span>
              )}
            </div>
          </div>

          {/* SLA deadline */}
          {os.slaDeadline && os.status !== "DONE" && os.status !== "CANCELLED" && (
            <div className={`text-right shrink-0 ${isOverdue ? "text-red-600" : "text-gray-500"}`}>
              <p className="text-xs font-medium">Prazo SLA</p>
              <p className="text-xs">{new Date(os.slaDeadline).toLocaleDateString("pt-BR")}</p>
              <p className="text-xs">
                {new Date(os.slaDeadline).toLocaleTimeString("pt-BR", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { Badge } from "@/components/ui/badge";
import { ServiceOrderActions } from "@/components/shared/ServiceOrderActions";
import { AlertCircle } from "lucide-react";
import type { ServiceOrderStatus, ServiceType } from "@prisma/client";

interface PageProps {
  params: Promise<{ id: string }>;
}

const STATUS_LABEL: Record<ServiceOrderStatus, string> = {
  DRAFT:            "Rascunho",
  PENDING_APPROVAL: "Aguardando aprovação",
  APPROVED:         "Aprovada",
  IN_PROGRESS:      "Em andamento",
  DONE:             "Concluída",
  REJECTED:         "Rejeitada",
  CANCELLED:        "Cancelada",
};

const STATUS_CLASS: Record<ServiceOrderStatus, string> = {
  DRAFT:            "bg-gray-100 text-gray-700 hover:bg-gray-100",
  PENDING_APPROVAL: "bg-yellow-100 text-yellow-800 hover:bg-yellow-100",
  APPROVED:         "bg-blue-100 text-blue-800 hover:bg-blue-100",
  IN_PROGRESS:      "bg-purple-100 text-purple-800 hover:bg-purple-100",
  DONE:             "bg-green-100 text-green-800 hover:bg-green-100",
  REJECTED:         "bg-red-100 text-red-800 hover:bg-red-100",
  CANCELLED:        "bg-gray-200 text-gray-600 hover:bg-gray-200",
};

const SERVICE_TYPE_LABEL: Record<ServiceType, string> = {
  CLEANING:   "Limpeza",
  ELECTRICAL: "Elétrica",
  HYDRAULIC:  "Hidráulica",
  OTHER:      "Outro",
};

function DetailRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs text-gray-400 uppercase tracking-wide mb-0.5">{label}</p>
      <div className="text-sm text-gray-800">{children}</div>
    </div>
  );
}

export default async function ServiceOrderDetailPage({ params }: PageProps) {
  const session = await auth();
  if (!session) redirect("/login");

  const { role, unitIds } = session.user;
  if (role === "MEMBER") redirect("/dashboard");

  const { id } = await params;

  const os = await db.serviceOrder.findUnique({
    where: { id },
    include: {
      ticket:    { select: { id: true, number: true, description: true } },
      unit:      { select: { id: true, name: true } },
      space:     { select: { id: true, name: true, type: true } },
      createdBy: { select: { id: true, name: true } },
      approvedBy:{ select: { id: true, name: true } },
      provider:  { select: { id: true, name: true, specialty: true, type: true } },
    },
  });

  if (!os) notFound();

  if (role === "RECEPTIONIST" && !unitIds.includes(os.unitId)) {
    redirect("/dashboard/admin/service-orders");
  }

  const isOverdue =
    os.slaDeadline &&
    new Date(os.slaDeadline) < new Date() &&
    os.status !== "DONE" &&
    os.status !== "CANCELLED";

  return (
    <div className="max-w-3xl space-y-8">
      {/* Cabeçalho */}
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          <span className="font-mono text-xl font-bold text-gray-900">{os.number}</span>
          <Badge className={STATUS_CLASS[os.status]}>{STATUS_LABEL[os.status]}</Badge>
          {isOverdue && (
            <span className="flex items-center gap-1 text-sm text-red-600 font-medium">
              <AlertCircle className="h-4 w-4" />
              SLA vencido
            </span>
          )}
        </div>

        <ServiceOrderActions
          osId={os.id}
          status={os.status}
          role={role}
          unitId={os.unitId}
          userUnitIds={unitIds}
        />
      </div>

      {/* Detalhes */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-5">
        <DetailRow label="Ticket vinculado">
          <span className="font-mono font-semibold">{os.ticket.number}</span>
          <p className="text-gray-500 text-xs mt-0.5 line-clamp-2">{os.ticket.description}</p>
        </DetailRow>

        <DetailRow label="Unidade">{os.unit.name}</DetailRow>

        <DetailRow label="Tipo de serviço">{SERVICE_TYPE_LABEL[os.serviceType]}</DetailRow>

        {os.provider && (
          <DetailRow label="Prestador">{os.provider.name}</DetailRow>
        )}

        {os.space && (
          <DetailRow label="Espaço afetado">{os.space.name}</DetailRow>
        )}

        {os.scheduledDate && (
          <DetailRow label="Data agendada">
            {new Date(os.scheduledDate).toLocaleDateString("pt-BR")}
          </DetailRow>
        )}

        {os.value && (
          <DetailRow label="Valor estimado">
            {Number(os.value).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
          </DetailRow>
        )}

        {os.approvedAt && (
          <DetailRow label="Data de aprovação">
            {new Date(os.approvedAt).toLocaleDateString("pt-BR")}
          </DetailRow>
        )}

        {os.slaDeadline && (
          <DetailRow label="Prazo SLA">
            <span className={isOverdue ? "text-red-600 font-medium" : ""}>
              {new Date(os.slaDeadline).toLocaleDateString("pt-BR")}{" "}
              {new Date(os.slaDeadline).toLocaleTimeString("pt-BR", {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
          </DetailRow>
        )}

        <DetailRow label="Criado por">
          {os.createdBy.name ?? "—"}
          <span className="text-gray-400 text-xs ml-2">
            {new Date(os.createdAt).toLocaleDateString("pt-BR")}
          </span>
        </DetailRow>

        {os.approvedBy && (
          <DetailRow label="Aprovado por">{os.approvedBy.name ?? "—"}</DetailRow>
        )}
      </div>

      {/* Descrição */}
      <div>
        <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Descrição</p>
        <p className="text-sm text-gray-800 whitespace-pre-wrap">{os.description}</p>
      </div>
    </div>
  );
}

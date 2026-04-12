import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ServiceOrderCard } from "@/components/shared/ServiceOrderCard";
import { TicketActions } from "@/components/shared/TicketActions";
import { ActivityTimeline } from "@/components/shared/ActivityTimeline";
import { Building2, Hash, Plus, Clock, CheckCircle2, AlertCircle } from "lucide-react";
import type { Priority, TicketStatus } from "@prisma/client";

interface PageProps {
  params: Promise<{ id: string }>;
}

const STATUS_LABEL: Record<TicketStatus, string> = {
  OPEN:          "Aberto",
  IN_PROGRESS:   "Em andamento",
  PENDING_CLOSE: "Aguardando fechamento",
  CLOSED:        "Fechado",
};

const STATUS_CLASS: Record<TicketStatus, string> = {
  OPEN:          "bg-blue-100 text-blue-800 hover:bg-blue-100",
  IN_PROGRESS:   "bg-yellow-100 text-yellow-800 hover:bg-yellow-100",
  PENDING_CLOSE: "bg-purple-100 text-purple-800 hover:bg-purple-100",
  CLOSED:        "bg-green-100 text-green-800 hover:bg-green-100",
};

const PRIORITY_LABEL: Record<Priority, string> = {
  LOW:    "Baixa",
  MEDIUM: "Média",
  HIGH:   "Alta",
  URGENT: "Urgente",
};

const PRIORITY_CLASS: Record<Priority, string> = {
  LOW:    "bg-gray-100 text-gray-600 hover:bg-gray-100",
  MEDIUM: "bg-blue-100 text-blue-700 hover:bg-blue-100",
  HIGH:   "bg-orange-100 text-orange-700 hover:bg-orange-100",
  URGENT: "bg-red-100 text-red-700 hover:bg-red-100",
};

function SlaIndicator({
  label,
  deadline,
  doneAt,
}: {
  label:    string;
  deadline: Date | null;
  doneAt:   Date | null;
}) {
  if (!deadline) return null;

  const now       = new Date();
  const isBreached = !doneAt && deadline < now;
  const isDone     = !!doneAt;

  if (isDone) {
    const onTime = doneAt <= deadline;
    return (
      <div className="flex items-center gap-1.5 text-sm">
        <CheckCircle2 className={`h-4 w-4 ${onTime ? "text-green-500" : "text-red-500"}`} />
        <span className={onTime ? "text-green-700" : "text-red-700"}>
          {label}: {onTime ? "Dentro do prazo" : "Fora do prazo"}
        </span>
      </div>
    );
  }

  if (isBreached) {
    return (
      <div className="flex items-center gap-1.5 text-sm">
        <AlertCircle className="h-4 w-4 text-red-500" />
        <span className="text-red-700">
          {label}: Vencido em{" "}
          {new Date(deadline).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
        </span>
      </div>
    );
  }

  const diffMs   = deadline.getTime() - now.getTime();
  const diffH    = Math.floor(diffMs / (1000 * 60 * 60));
  const diffMin  = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
  const timeLeft = diffH > 0 ? `${diffH}h ${diffMin}min` : `${diffMin}min`;

  return (
    <div className="flex items-center gap-1.5 text-sm">
      <Clock className="h-4 w-4 text-yellow-500" />
      <span className="text-yellow-700">
        {label}: Vence em {timeLeft}
      </span>
    </div>
  );
}

export default async function TicketDetailPage({ params }: PageProps) {
  const session = await auth();
  if (!session) redirect("/login");

  const { role, unitIds } = session.user;
  if (role === "MEMBER") redirect("/dashboard");

  const { id } = await params;

  const ticket = await db.ticket.findUnique({
    where: { id },
    include: {
      unit:      { select: { id: true, name: true } },
      createdBy: { select: { id: true, name: true } },
      serviceOrders: {
        orderBy: { createdAt: "desc" },
        include: {
          unit:      { select: { id: true, name: true } },
          createdBy: { select: { id: true, name: true } },
          provider:  { select: { id: true, name: true, type: true } },
        },
      },
    },
  });

  if (!ticket) notFound();

  // RECEPTIONIST só vê tickets das suas unidades
  if (role === "RECEPTIONIST" && !unitIds.includes(ticket.unitId)) {
    redirect("/dashboard/admin/tickets");
  }

  // Para o SLA de atendimento, considera "atendido" quando existe pelo menos 1 OS em progresso
  const firstActiveOs = ticket.serviceOrders.find(
    (os) => ["IN_PROGRESS", "DONE", "VALIDATED"].includes(os.status),
  );
  const attendanceDoneAt = firstActiveOs?.createdAt ?? null;

  // Para o SLA de resolução, considera "resolvido" quando ticket está CLOSED
  const resolutionDoneAt = ticket.status === "CLOSED" ? ticket.updatedAt : null;

  // Ocultar botão Nova OS quando ticket está fechado ou pedindo fechamento
  const canCreateOs = !["CLOSED", "PENDING_CLOSE"].includes(ticket.status);

  return (
    <div className="space-y-8">
      {/* Cabeçalho */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-lg font-bold text-gray-900">{ticket.number}</span>
            <Badge className={STATUS_CLASS[ticket.status]}>{STATUS_LABEL[ticket.status]}</Badge>
            <Badge className={PRIORITY_CLASS[ticket.priority]}>{PRIORITY_LABEL[ticket.priority]}</Badge>
          </div>
          {ticket.externalTicketId && (
            <p className="text-sm text-gray-400 flex items-center gap-1">
              <Hash className="h-3.5 w-3.5" />
              {ticket.externalTicketId}
            </p>
          )}
          <p className="flex items-center gap-1 text-sm text-gray-500">
            <Building2 className="h-3.5 w-3.5" />
            {ticket.unit.name}
          </p>
        </div>

        <div className="flex flex-col items-end gap-2">
          <TicketActions
            ticketId={id}
            status={ticket.status}
            role={role}
            unitId={ticket.unitId}
            unitIds={unitIds}
          />
          {canCreateOs && (
            <Link href={`/dashboard/admin/tickets/${id}/service-orders/new`}>
              <Button variant="outline" size="sm">
                <Plus className="h-4 w-4 mr-1" />
                Nova OS
              </Button>
            </Link>
          )}
        </div>
      </div>

      {/* SLA do Ticket */}
      {(ticket.slaAttendanceDeadline || ticket.slaResolutionDeadline) && (
        <div className="bg-gray-50 border border-gray-100 rounded-lg p-4 space-y-2">
          <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-2">SLA do chamado</p>
          <SlaIndicator
            label="Atendimento (1ª OS)"
            deadline={ticket.slaAttendanceDeadline}
            doneAt={attendanceDoneAt ? new Date(attendanceDoneAt) : null}
          />
          <SlaIndicator
            label="Resolução (fechamento)"
            deadline={ticket.slaResolutionDeadline}
            doneAt={resolutionDoneAt ? new Date(resolutionDoneAt) : null}
          />
        </div>
      )}

      {/* Descrição */}
      <div className="space-y-1">
        <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">Descrição</p>
        <p className="text-sm text-gray-800 whitespace-pre-wrap">{ticket.description}</p>
      </div>

      {/* Metadados */}
      <div className="grid grid-cols-2 gap-4 text-sm">
        <div>
          <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Criado por</p>
          <p className="text-gray-700">{ticket.createdBy.name}</p>
        </div>
        <div>
          <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Data de abertura</p>
          <p className="text-gray-700">{new Date(ticket.createdAt).toLocaleDateString("pt-BR")}</p>
        </div>
      </div>

      {/* Ordens de Serviço */}
      <div className="space-y-4">
        <h2 className="text-base font-semibold text-gray-900">
          Ordens de Serviço
          <span className="ml-2 text-sm font-normal text-gray-400">
            ({ticket.serviceOrders.length})
          </span>
        </h2>

        {ticket.serviceOrders.length === 0 ? (
          <div className="text-center py-12 text-gray-400 border border-dashed rounded-lg">
            Nenhuma OS vinculada a este ticket.
          </div>
        ) : (
          <div className="grid gap-3">
            {ticket.serviceOrders.map((os) => (
              <ServiceOrderCard key={os.id} serviceOrder={os} />
            ))}
          </div>
        )}
      </div>

      {/* Histórico de eventos do ticket */}
      <div className="bg-gray-50 border border-gray-100 rounded-lg p-4">
        <ActivityTimeline entityType="TICKET" entityId={id} />
      </div>
    </div>
  );
}

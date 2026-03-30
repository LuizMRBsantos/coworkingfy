import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ServiceOrderCard } from "@/components/shared/ServiceOrderCard";
import { Building2, Hash, Plus } from "lucide-react";
import type { Priority, TicketStatus } from "@prisma/client";

interface PageProps {
  params: Promise<{ id: string }>;
}

const STATUS_LABEL: Record<TicketStatus, string> = {
  OPEN:        "Aberto",
  IN_PROGRESS: "Em andamento",
  CLOSED:      "Fechado",
};

const STATUS_CLASS: Record<TicketStatus, string> = {
  OPEN:        "bg-blue-100 text-blue-800 hover:bg-blue-100",
  IN_PROGRESS: "bg-yellow-100 text-yellow-800 hover:bg-yellow-100",
  CLOSED:      "bg-green-100 text-green-800 hover:bg-green-100",
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

  return (
    <div className="space-y-8">
      {/* Cabeçalho */}
      <div className="flex items-start justify-between gap-4">
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

        <Link href={`/dashboard/admin/tickets/${id}/service-orders/new`}>
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Nova OS
          </Button>
        </Link>
      </div>

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
    </div>
  );
}

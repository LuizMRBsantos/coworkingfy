import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Building2, Calendar, Hash } from "lucide-react";
import type { Priority, TicketStatus } from "@prisma/client";

interface TicketCardProps {
  ticket: {
    id: string;
    number: string;
    externalTicketId: string | null;
    status: TicketStatus;
    priority: Priority;
    description: string;
    createdAt: Date;
    unit: { id: string; name: string };
    _count: { serviceOrders: number };
  };
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

export function TicketCard({ ticket }: TicketCardProps) {
  return (
    <Link href={`/dashboard/admin/tickets/${ticket.id}`} className="block">
      <Card className="hover:border-gray-300 transition-colors cursor-pointer">
        <CardContent className="p-5">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              {/* Número e badges */}
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <span className="font-mono text-sm font-semibold text-gray-900">{ticket.number}</span>
                <Badge className={STATUS_CLASS[ticket.status]}>{STATUS_LABEL[ticket.status]}</Badge>
                <Badge className={PRIORITY_CLASS[ticket.priority]}>{PRIORITY_LABEL[ticket.priority]}</Badge>
              </div>

              {/* Número externo */}
              {ticket.externalTicketId && (
                <p className="text-xs text-gray-400 mb-1 flex items-center gap-1">
                  <Hash className="h-3 w-3" />
                  {ticket.externalTicketId}
                </p>
              )}

              {/* Descrição */}
              <p className="text-sm text-gray-700 line-clamp-2">{ticket.description}</p>

              {/* Metadados */}
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-3 text-xs text-gray-500">
                <span className="flex items-center gap-1">
                  <Building2 className="h-3.5 w-3.5" />
                  {ticket.unit.name}
                </span>
                <span className="flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5" />
                  {new Date(ticket.createdAt).toLocaleDateString("pt-BR")}
                </span>
              </div>
            </div>

            {/* Contador de OS */}
            <div className="shrink-0">
              <div className="flex flex-col items-center bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 min-w-[48px]">
                <span className="text-lg font-bold text-gray-800 leading-none">
                  {ticket._count.serviceOrders}
                </span>
                <span className="text-[10px] text-gray-400 mt-0.5">OS</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

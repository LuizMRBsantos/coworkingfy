// 'use client' — botões de ação disparam PUT /api/tickets/[id] via fetch
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import type { Role, TicketStatus } from "@prisma/client";

interface TicketActionsProps {
  ticketId: string;
  status:   TicketStatus;
  role:     Role;
  unitId:   string;
  unitIds:  string[];
}

export function TicketActions({ ticketId, status, role, unitId, unitIds }: TicketActionsProps) {
  const router  = useRouter();
  const [loading, setLoading] = useState(false);

  // MEMBER não tem acesso
  if (role === "MEMBER") return null;
  // Ticket fechado não tem ações
  if (status === "CLOSED") return null;
  // RECEPTIONIST só vê tickets da sua unidade
  if (role === "RECEPTIONIST" && !unitIds.includes(unitId)) return null;

  async function transition(newStatus: TicketStatus, successMsg: string) {
    setLoading(true);
    const res = await fetch(`/api/tickets/${ticketId}`, {
      method:  "PUT",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ status: newStatus }),
    });
    setLoading(false);

    if (!res.ok) {
      const json = await res.json().catch(() => ({}));
      toast.error(json.error ?? "Erro ao atualizar ticket.");
      return;
    }

    toast.success(successMsg);
    router.refresh();
  }

  // ── RECEPTIONIST em IN_PROGRESS: pode solicitar fechamento
  if (role === "RECEPTIONIST" && status === "IN_PROGRESS") {
    return (
      <Button
        variant="default"
        disabled={loading}
        onClick={() => transition("PENDING_CLOSE", "Solicitação de fechamento enviada ao admin.")}
      >
        {loading ? "Aguarde..." : "Solicitar fechamento"}
      </Button>
    );
  }

  // ── RECEPTIONIST em OPEN: pode iniciar atendimento
  if (role === "RECEPTIONIST" && status === "OPEN") {
    return (
      <Button
        variant="outline"
        disabled={loading}
        onClick={() => transition("IN_PROGRESS", "Ticket em andamento.")}
      >
        {loading ? "Aguarde..." : "Iniciar atendimento"}
      </Button>
    );
  }

  // ── ADMIN: lógica por status
  if (role === "ADMIN") {
    if (status === "OPEN") {
      return (
        <Button
          variant="outline"
          disabled={loading}
          onClick={() => transition("IN_PROGRESS", "Ticket em andamento.")}
        >
          {loading ? "Aguarde..." : "Iniciar atendimento"}
        </Button>
      );
    }

    if (status === "IN_PROGRESS") {
      return (
        <Button
          variant="default"
          disabled={loading}
          onClick={() => transition("CLOSED", "Ticket fechado.")}
        >
          {loading ? "Aguarde..." : "Fechar ticket"}
        </Button>
      );
    }

    if (status === "PENDING_CLOSE") {
      return (
        <div className="flex gap-2">
          <Button
            variant="default"
            disabled={loading}
            onClick={() => transition("CLOSED", "Ticket fechado com sucesso.")}
          >
            {loading ? "Aguarde..." : "Confirmar fechamento"}
          </Button>
          <Button
            variant="outline"
            disabled={loading}
            onClick={() => transition("IN_PROGRESS", "Ticket devolvido para andamento.")}
          >
            {loading ? "Aguarde..." : "Rejeitar fechamento"}
          </Button>
        </div>
      );
    }
  }

  return null;
}

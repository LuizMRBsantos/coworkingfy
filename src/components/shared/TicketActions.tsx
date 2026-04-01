// 'use client' — botões de ação disparam PUT /api/tickets/[id] via fetch
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import type { Role, TicketStatus } from "@prisma/client";

interface TicketActionsProps {
  ticketId: string;
  status:   TicketStatus;
  role:     Role;
}

export function TicketActions({ ticketId, status, role }: TicketActionsProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState<string | null>(null);

  // Só ADMIN vê os botões
  if (role !== "ADMIN") return null;
  // Ticket fechado não tem ações
  if (status === "CLOSED") return null;

  const nextStatus: TicketStatus = status === "OPEN" ? "IN_PROGRESS" : "CLOSED";
  const label = status === "OPEN" ? "Iniciar atendimento" : "Fechar ticket";

  async function handleTransition() {
    setError(null);
    setLoading(true);
    const res = await fetch(`/api/tickets/${ticketId}`, {
      method:  "PUT",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ status: nextStatus }),
    });
    setLoading(false);

    if (!res.ok) {
      const json = await res.json().catch(() => ({}));
      setError(json.error ?? "Erro ao atualizar ticket.");
      return;
    }

    router.refresh();
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <Button
        variant={status === "IN_PROGRESS" ? "default" : "outline"}
        disabled={loading}
        onClick={handleTransition}
      >
        {loading ? "Aguarde..." : label}
      </Button>
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}

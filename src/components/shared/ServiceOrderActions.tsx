// 'use client' — botões de ação disparam PUT /api/service-orders/[id] via fetch
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import type { Role, ServiceOrderStatus } from "@prisma/client";

interface ServiceOrderActionsProps {
  osId:        string;
  status:      ServiceOrderStatus;
  role:        Role;
  unitId:      string;
  userUnitIds: string[];
}

export function ServiceOrderActions({
  osId,
  status,
  role,
  unitId,
  userUnitIds,
}: ServiceOrderActionsProps) {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // RECEPTIONIST só age nas suas unidades
  if (role === "RECEPTIONIST" && !userUnitIds.includes(unitId)) return null;

  async function transition(newStatus: ServiceOrderStatus) {
    setError(null);
    setLoading(newStatus);
    const res = await fetch(`/api/service-orders/${osId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });
    setLoading(null);
    if (!res.ok) {
      const json = await res.json().catch(() => ({}));
      setError(json.error ?? "Erro ao atualizar status.");
      return;
    }
    router.refresh();
  }

  const buttons: {
    label: string;
    newStatus: ServiceOrderStatus;
    variant?: "outline" | "destructive";
  }[] = [];

  if (status === "DRAFT" && (role === "ADMIN" || role === "RECEPTIONIST")) {
    buttons.push({ label: "Enviar para aprovação", newStatus: "PENDING_APPROVAL" });
  }
  if (status === "PENDING_APPROVAL" && role === "ADMIN") {
    buttons.push({ label: "Aprovar", newStatus: "APPROVED" });
    buttons.push({ label: "Rejeitar", newStatus: "REJECTED", variant: "destructive" });
  }
  if (status === "APPROVED" && (role === "ADMIN" || role === "RECEPTIONIST")) {
    buttons.push({ label: "Iniciar", newStatus: "IN_PROGRESS" });
  }
  if (status === "IN_PROGRESS" && (role === "ADMIN" || role === "RECEPTIONIST")) {
    buttons.push({ label: "Concluir", newStatus: "DONE" });
  }
  const cancelAllowed = ["DRAFT", "PENDING_APPROVAL", "APPROVED", "IN_PROGRESS"].includes(status);
  if (cancelAllowed && (role === "ADMIN" || role === "RECEPTIONIST")) {
    buttons.push({ label: "Cancelar OS", newStatus: "CANCELLED", variant: "outline" });
  }

  if (buttons.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2">
      {buttons.map((b) => (
        <Button
          key={b.newStatus}
          variant={b.variant ?? "default"}
          disabled={loading !== null}
          onClick={() => transition(b.newStatus)}
        >
          {loading === b.newStatus ? "Aguarde..." : b.label}
        </Button>
      ))}
      {error && <p className="w-full text-sm text-red-500">{error}</p>}
    </div>
  );
}

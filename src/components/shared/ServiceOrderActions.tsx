// 'use client' — botões de ação disparam PUT /api/service-orders/[id] via fetch
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { OSCancelDialog } from "@/components/shared/OSCancelDialog";
import { OSRemoteFinishDialog } from "@/components/shared/OSRemoteFinishDialog";
import { OSDoneDialog } from "@/components/shared/OSDoneDialog";
import type { Role, ServiceOrderStatus } from "@prisma/client";

interface ServiceOrderActionsProps {
  osId:        string;
  status:      ServiceOrderStatus;
  isRemote:    boolean;
  role:        Role;
  unitId:      string;
  userUnitIds: string[];
}

export function ServiceOrderActions({
  osId,
  status,
  isRemote,
  role,
  unitId,
  userUnitIds,
}: ServiceOrderActionsProps) {
  const router  = useRouter();
  const [loading,           setLoading]           = useState<string | null>(null);
  const [cancelOpen,        setCancelOpen]        = useState(false);
  const [remoteFinishOpen,  setRemoteFinishOpen]  = useState(false);
  const [doneOpen,          setDoneOpen]          = useState(false);

  // MEMBER nunca tem ações; RECEPTIONIST só age nas suas unidades; ADMIN age em tudo
  if (role === "MEMBER") return null;
  if (role === "RECEPTIONIST" && !userUnitIds.includes(unitId)) return null;

  async function transition(newStatus: ServiceOrderStatus) {
    setLoading(newStatus);
    const res = await fetch(`/api/service-orders/${osId}`, {
      method:  "PUT",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ status: newStatus }),
    });
    setLoading(null);

    if (!res.ok) {
      const json = await res.json().catch(() => ({}));
      toast.error(json.error ?? "Erro ao atualizar status.");
      return;
    }

    const labels: Partial<Record<ServiceOrderStatus, string>> = {
      PENDING_APPROVAL: "OS enviada para aprovação.",
      APPROVED:         "OS aprovada.",
      REJECTED:         "OS rejeitada.",
      IN_PROGRESS:      "OS iniciada.",
      DONE:             "OS concluída.",
      VALIDATED:        "OS validada.",
    };
    toast.success(labels[newStatus] ?? "Status atualizado.");
    router.refresh();
  }

  const buttons: {
    label:     string;
    newStatus: ServiceOrderStatus;
    variant?:  "outline" | "destructive";
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
  // OS remota aprovada: botão de encerramento direto (sem passar por IN_PROGRESS)
  const showRemoteFinish = isRemote && status === "APPROVED" &&
    (role === "ADMIN" || role === "RECEPTIONIST");
  // "Concluir" abre dialog para coletar relatório de execução — não entra no array buttons
  const showDone = status === "IN_PROGRESS" && (role === "ADMIN" || role === "RECEPTIONIST");
  if (status === "DONE" && role === "ADMIN") {
    buttons.push({ label: "Validar", newStatus: "VALIDATED" });
  }

  const cancelAllowed = ["DRAFT", "PENDING_APPROVAL", "APPROVED", "IN_PROGRESS"].includes(status);

  if (buttons.length === 0 && !cancelAllowed && !showRemoteFinish && !showDone) return null;

  return (
    <>
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
        {showDone && (
          <Button
            disabled={loading !== null}
            onClick={() => setDoneOpen(true)}
          >
            Concluir
          </Button>
        )}
        {showRemoteFinish && (
          <Button
            variant="outline"
            disabled={loading !== null}
            onClick={() => setRemoteFinishOpen(true)}
            className="border-blue-200 text-blue-700 hover:bg-blue-50"
          >
            Concluir remotamente
          </Button>
        )}
        {cancelAllowed && (
          <Button
            variant="outline"
            disabled={loading !== null}
            onClick={() => setCancelOpen(true)}
          >
            Cancelar OS
          </Button>
        )}
      </div>

      <OSCancelDialog
        osId={osId}
        open={cancelOpen}
        onClose={() => setCancelOpen(false)}
      />
      <OSRemoteFinishDialog
        osId={osId}
        open={remoteFinishOpen}
        onClose={() => setRemoteFinishOpen(false)}
      />
      <OSDoneDialog
        osId={osId}
        open={doneOpen}
        onClose={() => setDoneOpen(false)}
      />
    </>
  );
}

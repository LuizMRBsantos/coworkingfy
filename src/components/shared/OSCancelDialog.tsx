// 'use client' — dialog interativo com estado e submit para API
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

interface OSCancelDialogProps {
  osId:    string;
  open:    boolean;
  onClose: () => void;
}

export function OSCancelDialog({ osId, open, onClose }: OSCancelDialogProps) {
  const router  = useRouter();
  const [reason,  setReason]  = useState("");
  const [loading, setLoading] = useState(false);

  async function handleCancel() {
    if (!reason.trim()) {
      toast.error("Informe o motivo do cancelamento.");
      return;
    }
    setLoading(true);
    const res = await fetch(`/api/service-orders/${osId}`, {
      method:  "PUT",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ status: "CANCELLED", cancellationReason: reason }),
    });
    setLoading(false);

    if (!res.ok) {
      const json = await res.json().catch(() => ({}));
      toast.error(json.error ?? "Erro ao cancelar OS.");
      return;
    }

    toast.success("OS cancelada.");
    onClose();
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Cancelar OS</DialogTitle>
          <DialogDescription>
            Informe o motivo do cancelamento. Esta ação não pode ser desfeita.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2 py-2">
          <Label htmlFor="cancel-reason">Motivo</Label>
          <Textarea
            id="cancel-reason"
            placeholder="Descreva o motivo do cancelamento..."
            rows={3}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Voltar
          </Button>
          <Button variant="destructive" onClick={handleCancel} disabled={loading}>
            {loading ? "Cancelando..." : "Confirmar cancelamento"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

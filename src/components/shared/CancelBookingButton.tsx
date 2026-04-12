// 'use client' — ação de cancelamento com confirmação e chamada à API
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

interface CancelBookingButtonProps {
  bookingId: string;
}

export function CancelBookingButton({ bookingId }: CancelBookingButtonProps) {
  const router  = useRouter();
  const [loading, setLoading] = useState(false);
  const [confirm, setConfirm] = useState(false);

  async function handleCancel() {
    setLoading(true);

    const res = await fetch(`/api/bookings/${bookingId}`, { method: "DELETE" });

    setLoading(false);
    setConfirm(false);

    if (!res.ok) {
      const json = await res.json().catch(() => ({}));
      toast.error((json as { error?: string }).error ?? "Erro ao cancelar. Tente novamente.");
      return;
    }

    toast.success("Reserva cancelada.");
    router.refresh();
  }

  if (confirm) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-xs text-gray-500">Confirmar cancelamento?</span>
        <Button size="sm" variant="destructive" onClick={handleCancel} disabled={loading}>
          {loading ? "Cancelando..." : "Sim, cancelar"}
        </Button>
        <Button size="sm" variant="outline" onClick={() => setConfirm(false)} disabled={loading}>
          Não
        </Button>
      </div>
    );
  }

  return (
    <Button
      size="sm"
      variant="outline"
      className="text-red-600 border-red-200 hover:bg-red-50"
      onClick={() => setConfirm(true)}
    >
      Cancelar reserva
    </Button>
  );
}

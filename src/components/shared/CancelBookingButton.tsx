// 'use client' — ação de cancelamento com confirmação e chamada à API
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

interface CancelBookingButtonProps {
  bookingId: string;
}

export function CancelBookingButton({ bookingId }: CancelBookingButtonProps) {
  const router = useRouter();
  const [loading, setLoading]   = useState(false);
  const [error,   setError]     = useState<string | null>(null);
  const [confirm, setConfirm]   = useState(false);

  async function handleCancel() {
    setLoading(true);
    setError(null);

    const res = await fetch(`/api/bookings/${bookingId}`, { method: "DELETE" });

    if (!res.ok) {
      const json = await res.json().catch(() => ({}));
      setError((json as { error?: string }).error ?? "Erro ao cancelar. Tente novamente.");
      setLoading(false);
      setConfirm(false);
      return;
    }

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
        {error && <p className="text-xs text-red-500">{error}</p>}
      </div>
    );
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <Button size="sm" variant="outline" className="text-red-600 border-red-200 hover:bg-red-50" onClick={() => setConfirm(true)}>
        Cancelar reserva
      </Button>
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}

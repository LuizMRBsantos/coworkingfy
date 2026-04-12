// 'use client' — ações de aprovação/rejeição com chamada à API
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

interface BookingActionsProps {
  bookingId: string;
}

export function BookingActions({ bookingId }: BookingActionsProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handle(action: "approve" | "reject") {
    setLoading(true);

    const res = await fetch(`/api/bookings/${bookingId}`, {
      method:  "PUT",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ action }),
    });

    setLoading(false);

    if (!res.ok) {
      const json = await res.json().catch(() => ({}));
      toast.error((json as { error?: string }).error ?? "Erro ao processar. Tente novamente.");
      return;
    }

    toast.success(action === "approve" ? "Reserva aprovada." : "Reserva rejeitada.");
    router.refresh();
  }

  return (
    <div className="flex gap-2">
      <Button size="sm" onClick={() => handle("approve")} disabled={loading}>
        {loading ? "..." : "Aprovar"}
      </Button>
      <Button
        size="sm"
        variant="outline"
        className="text-red-600 border-red-200 hover:bg-red-50"
        onClick={() => handle("reject")}
        disabled={loading}
      >
        Rejeitar
      </Button>
    </div>
  );
}

// 'use client' — ações de aprovação/rejeição com chamada à API
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

interface BookingActionsProps {
  bookingId: string;
}

export function BookingActions({ bookingId }: BookingActionsProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState<string | null>(null);

  async function handle(action: "approve" | "reject") {
    setLoading(true);
    setError(null);

    const res = await fetch(`/api/bookings/${bookingId}`, {
      method:  "PUT",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ action }),
    });

    if (!res.ok) {
      const json = await res.json().catch(() => ({}));
      setError((json as { error?: string }).error ?? "Erro ao processar. Tente novamente.");
      setLoading(false);
      return;
    }

    router.refresh();
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex gap-2">
        <Button
          size="sm"
          onClick={() => handle("approve")}
          disabled={loading}
        >
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
      {error && <p className="text-xs text-red-500 text-right">{error}</p>}
    </div>
  );
}

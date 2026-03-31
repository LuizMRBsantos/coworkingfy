// 'use client' — chama DELETE /api/users/[id] via fetch
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

interface UserDeactivateButtonProps {
  userId: string;
  active: boolean;
  isSelf: boolean;
}

export function UserDeactivateButton({ userId, active, isSelf }: UserDeactivateButtonProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  // Não renderiza se já inativo ou se é o próprio usuário logado
  if (!active || isSelf) return null;

  async function handleDeactivate() {
    if (!confirm("Desativar este usuário? Ele não conseguirá mais fazer login.")) return;
    setLoading(true);
    const res = await fetch(`/api/users/${userId}`, { method: "DELETE" });
    setLoading(false);
    if (res.ok) router.push("/dashboard/admin/users");
  }

  return (
    <Button
      variant="outline"
      onClick={handleDeactivate}
      disabled={loading}
      className="text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700 shrink-0"
    >
      {loading ? "Desativando..." : "Desativar usuário"}
    </Button>
  );
}

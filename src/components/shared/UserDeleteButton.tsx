// 'use client' — chama DELETE /api/users/[id] via fetch para apagar permanentemente
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

interface UserDeleteButtonProps {
  userId: string;
  isSelf: boolean;
}

export function UserDeleteButton({ userId, isSelf }: UserDeleteButtonProps) {
  const router  = useRouter();
  const [loading, setLoading] = useState(false);

  // Não renderiza se é o próprio usuário logado
  if (isSelf) return null;

  async function handleDelete() {
    if (!confirm("Apagar este usuário permanentemente? Esta ação não pode ser desfeita.")) return;
    setLoading(true);
    const res = await fetch(`/api/users/${userId}`, { method: "DELETE" });
    setLoading(false);

    if (res.ok) {
      toast.success("Usuário apagado.");
      router.push("/dashboard/admin/users");
    } else {
      const json = await res.json().catch(() => ({}));
      toast.error(json.error ?? "Erro ao apagar usuário.");
    }
  }

  return (
    <Button
      variant="outline"
      onClick={handleDelete}
      disabled={loading}
      className="text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700 shrink-0"
    >
      {loading ? "Apagando..." : "Apagar usuário"}
    </Button>
  );
}

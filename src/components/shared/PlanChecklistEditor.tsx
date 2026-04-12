// 'use client' — gerencia lista de itens de checklist do plano de manutenção
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Trash2, GripVertical, ListChecks } from "lucide-react";

interface PlanChecklistEditorProps {
  planId:   string;
  initial:  { id: string; item: string }[];
}

export function PlanChecklistEditor({ planId, initial }: PlanChecklistEditorProps) {
  const router   = useRouter();
  const [items,   setItems]   = useState<string[]>(initial.map((i) => i.item));
  const [newItem, setNewItem] = useState("");
  const [saving,  setSaving]  = useState(false);

  function addItem() {
    const trimmed = newItem.trim();
    if (!trimmed) return;
    if (items.includes(trimmed)) {
      toast.error("Item já existe na lista.");
      return;
    }
    setItems((prev) => [...prev, trimmed]);
    setNewItem("");
  }

  function removeItem(index: number) {
    setItems((prev) => prev.filter((_, i) => i !== index));
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
      addItem();
    }
  }

  async function save() {
    setSaving(true);
    const res = await fetch(`/api/maintenance-plans/${planId}`, {
      method:  "PUT",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ checklists: items }),
    });
    setSaving(false);

    if (!res.ok) {
      const json = await res.json().catch(() => ({}));
      toast.error((json as { error?: string }).error ?? "Erro ao salvar checklist.");
      return;
    }

    toast.success("Checklist salvo com sucesso.");
    router.refresh();
  }

  return (
    <Card>
      <CardContent className="pt-5 space-y-4">
        <div className="flex items-center gap-2 mb-1">
          <ListChecks className="h-4 w-4 text-gray-500" />
          <p className="text-sm font-semibold text-gray-700">
            Checklist do plano
            <span className="ml-1.5 text-gray-400 font-normal">({items.length} itens)</span>
          </p>
        </div>

        <p className="text-xs text-gray-400">
          Estes itens serão copiados automaticamente para cada OS gerada por este plano.
        </p>

        {/* Lista de itens */}
        {items.length === 0 ? (
          <p className="text-xs text-gray-400 italic py-2">Nenhum item adicionado ainda.</p>
        ) : (
          <ul className="space-y-1.5">
            {items.map((item, index) => (
              <li key={index} className="flex items-center gap-2 group">
                <GripVertical className="h-3.5 w-3.5 text-gray-300 shrink-0" />
                <span className="flex-1 text-sm text-gray-700 bg-gray-50 rounded px-2.5 py-1.5 border border-gray-100">
                  {item}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100 transition-opacity text-red-400 hover:text-red-600 hover:bg-red-50"
                  onClick={() => removeItem(index)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </li>
            ))}
          </ul>
        )}

        {/* Input para novo item */}
        <div className="flex gap-2">
          <Input
            value={newItem}
            onChange={(e) => setNewItem(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ex: Verificar filtros de ar-condicionado"
            className="text-sm"
          />
          <Button type="button" variant="outline" size="sm" onClick={addItem} disabled={!newItem.trim()}>
            <Plus className="h-4 w-4" />
          </Button>
        </div>

        {/* Botão salvar */}
        <div className="flex justify-end">
          <Button size="sm" onClick={save} disabled={saving}>
            {saving ? "Salvando..." : "Salvar checklist"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

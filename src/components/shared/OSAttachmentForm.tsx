// 'use client' — formulário de upload de anexo (URL externa, sem file upload direto)
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Paperclip, Trash2, ExternalLink } from "lucide-react";

interface Attachment {
  id:         string;
  name:       string;
  url:        string;
  createdAt:  Date | string;
  uploadedBy: { id: string; name: string | null };
}

interface OSAttachmentFormProps {
  osId:        string;
  attachments: Attachment[];
  canEdit:     boolean;
}

export function OSAttachmentForm({ osId, attachments, canEdit }: OSAttachmentFormProps) {
  const router         = useRouter();
  const [name, setName] = useState("");
  const [url,  setUrl]  = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function handleAdd() {
    if (!name.trim() || !url.trim()) {
      toast.error("Preencha nome e URL do anexo.");
      return;
    }
    setSubmitting(true);
    const res = await fetch(`/api/service-orders/${osId}/attachments`, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ name: name.trim(), url: url.trim() }),
    });
    setSubmitting(false);

    if (!res.ok) {
      const json = await res.json().catch(() => ({}));
      toast.error(json.error ?? "Erro ao adicionar anexo.");
      return;
    }

    toast.success("Anexo adicionado.");
    setName("");
    setUrl("");
    router.refresh();
  }

  async function handleDelete(attachmentId: string) {
    setDeletingId(attachmentId);
    const res = await fetch(
      `/api/service-orders/${osId}/attachments/${attachmentId}`,
      { method: "DELETE" },
    );
    setDeletingId(null);

    if (!res.ok && res.status !== 204) {
      toast.error("Erro ao remover anexo.");
      return;
    }

    toast.success("Anexo removido.");
    router.refresh();
  }

  return (
    <div className="space-y-4">
      {/* Lista de anexos */}
      {attachments.length > 0 ? (
        <ul className="divide-y divide-gray-100 border border-gray-100 rounded-lg overflow-hidden">
          {attachments.map((att) => (
            <li key={att.id} className="flex items-center justify-between px-4 py-3 bg-white hover:bg-gray-50">
              <div className="flex items-center gap-2 min-w-0">
                <Paperclip className="h-4 w-4 text-gray-400 shrink-0" />
                <a
                  href={att.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-blue-600 hover:underline truncate flex items-center gap-1"
                >
                  {att.name}
                  <ExternalLink className="h-3 w-3 shrink-0" />
                </a>
              </div>
              <div className="flex items-center gap-3 ml-4 shrink-0">
                <span className="text-xs text-gray-400 hidden sm:block">
                  {att.uploadedBy.name} · {new Date(att.createdAt).toLocaleDateString("pt-BR")}
                </span>
                {canEdit && (
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7 text-gray-400 hover:text-red-500"
                    disabled={deletingId === att.id}
                    onClick={() => handleDelete(att.id)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-gray-400">Nenhum anexo adicionado.</p>
      )}

      {/* Formulário de adição */}
      {canEdit && (
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="flex-1 space-y-1">
            <Label htmlFor="att-name" className="text-xs">Nome do documento</Label>
            <Input
              id="att-name"
              placeholder="Ex: Laudo técnico"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="flex-1 space-y-1">
            <Label htmlFor="att-url" className="text-xs">URL</Label>
            <Input
              id="att-url"
              placeholder="https://..."
              value={url}
              onChange={(e) => setUrl(e.target.value)}
            />
          </div>
          <div className="flex items-end">
            <Button onClick={handleAdd} disabled={submitting} variant="outline" size="sm" className="w-full sm:w-auto">
              {submitting ? "Adicionando..." : "Adicionar"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

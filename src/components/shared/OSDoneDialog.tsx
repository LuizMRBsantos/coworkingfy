// 'use client' — dialog interativo para o gestor informar relatório e fotos ao concluir uma OS
"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Camera, X, Loader2 } from "lucide-react";

interface OSDoneDialogProps {
  osId:    string;
  open:    boolean;
  onClose: () => void;
}

export function OSDoneDialog({ osId, open, onClose }: OSDoneDialogProps) {
  const router   = useRouter();
  const fileRef  = useRef<HTMLInputElement>(null);

  const [report,   setReport]   = useState("");
  const [photos,   setPhotos]   = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [loading,  setLoading]  = useState(false);

  function addPhotos(files: FileList | null) {
    if (!files) return;
    const newFiles    = Array.from(files);
    const newPreviews = newFiles.map((f) => URL.createObjectURL(f));
    setPhotos((prev)   => [...prev, ...newFiles]);
    setPreviews((prev) => [...prev, ...newPreviews]);
  }

  function removePhoto(index: number) {
    URL.revokeObjectURL(previews[index]);
    setPhotos((prev)   => prev.filter((_, i) => i !== index));
    setPreviews((prev) => prev.filter((_, i) => i !== index));
  }

  function handleClose() {
    if (loading) return;
    previews.forEach((url) => URL.revokeObjectURL(url));
    setReport("");
    setPhotos([]);
    setPreviews([]);
    onClose();
  }

  async function handleSubmit() {
    if (!report.trim()) {
      toast.error("Relatório de execução obrigatório.");
      return;
    }

    setLoading(true);

    const fd = new FormData();
    fd.append("executionReport", report.trim());
    photos.forEach((f) => fd.append("photos", f));

    const res  = await fetch(`/api/service-orders/${osId}/finish-manual`, {
      method: "POST",
      body:   fd,
    });
    const json = await res.json().catch(() => ({}));

    setLoading(false);

    if (!res.ok) {
      toast.error(json.error ?? "Erro ao concluir OS.");
      return;
    }

    toast.success("OS concluída.");
    handleClose();
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) handleClose(); }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Concluir OS</DialogTitle>
          <DialogDescription>
            Registre o relatório de execução. Fotos de evidência são opcionais.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-2">
          {/* Upload de fotos (opcional) */}
          <div className="space-y-2">
            <Label className="flex items-center gap-1.5">
              <Camera className="h-3.5 w-3.5" />
              Fotos de evidência <span className="text-xs text-gray-400 font-normal">(opcional)</span>
            </Label>

            {previews.length > 0 && (
              <div className="grid grid-cols-4 gap-2">
                {previews.map((src, i) => (
                  <div key={i} className="relative aspect-square">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={src}
                      alt={`foto ${i + 1}`}
                      className="w-full h-full object-cover rounded-md border border-gray-200"
                    />
                    <button
                      type="button"
                      onClick={() => removePhoto(i)}
                      className="absolute -top-1.5 -right-1.5 bg-gray-900 rounded-full p-0.5 text-white hover:bg-red-600 transition-colors"
                    >
                      <X className="h-2.5 w-2.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="w-full py-3 rounded-lg border-2 border-dashed border-gray-200 text-sm text-gray-500
                         hover:border-gray-300 hover:text-gray-700 transition-colors flex items-center justify-center gap-2"
            >
              <Camera className="h-4 w-4" />
              {previews.length === 0 ? "Adicionar fotos" : "Adicionar mais fotos"}
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(e) => addPhotos(e.target.files)}
            />
          </div>

          {/* Relatório */}
          <div className="space-y-2">
            <Label htmlFor="done-report">
              Relatório de execução <span className="text-red-500">*</span>
            </Label>
            <Textarea
              id="done-report"
              placeholder="Descreva o que foi realizado, ajustes, peças substituídas ou serviços executados..."
              rows={4}
              value={report}
              onChange={(e) => setReport(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={handleClose} disabled={loading}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? (
              <span className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" /> Aguarde...
              </span>
            ) : "Concluir OS"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// 'use client' — geolocalização, upload de fotos e transições de estado da OS pelo prestador
"use client";

import { useState, useRef } from "react";
import { MapPin, Camera, FileText, CheckCircle2, Clock, AlertCircle, Wifi, Loader2, X } from "lucide-react";
import type { ServiceOrderStatus } from "@prisma/client";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ProviderOSClientProps {
  serviceOrderId: string;
  osNumber:       string;
  status:         ServiceOrderStatus;
  description:    string;
  isRemote:       boolean;
  scheduledDate:  string | null;
  unitName:       string;
  unitAddress:    string | null;
  providerName:   string | null;
  token:          string;
  isExpired:      boolean;
  isOperable:     boolean;
  hasUnitCoords:  boolean;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function fmtDate(iso: string | null): string {
  if (!iso) return "Sem data definida";
  return new Date(iso).toLocaleDateString("pt-BR", {
    day: "2-digit", month: "2-digit", year: "numeric",
  });
}

// ---------------------------------------------------------------------------
// Components
// ---------------------------------------------------------------------------

function OSInfoCard({
  osNumber, description, unitName, unitAddress, scheduledDate, providerName,
}: Pick<ProviderOSClientProps, "osNumber" | "description" | "unitName" | "unitAddress" | "scheduledDate" | "providerName">) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
      <div>
        <p className="text-xs text-gray-400 uppercase tracking-wide">Ordem de Serviço</p>
        <p className="text-xl font-bold font-mono text-gray-900 mt-0.5">{osNumber}</p>
      </div>

      <div className="space-y-2 text-sm">
        <div className="flex items-start gap-2 text-gray-700">
          <MapPin className="h-4 w-4 text-gray-400 shrink-0 mt-0.5" />
          <div>
            <p className="font-medium">{unitName}</p>
            {unitAddress && <p className="text-gray-400 text-xs">{unitAddress}</p>}
          </div>
        </div>

        {scheduledDate && (
          <div className="flex items-center gap-2 text-gray-600">
            <Clock className="h-4 w-4 text-gray-400 shrink-0" />
            <p>Agendado: {fmtDate(scheduledDate)}</p>
          </div>
        )}

        {providerName && (
          <div className="flex items-center gap-2 text-gray-600">
            <FileText className="h-4 w-4 text-gray-400 shrink-0" />
            <p>{providerName}</p>
          </div>
        )}
      </div>

      <div className="pt-2 border-t border-gray-100">
        <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Descrição do serviço</p>
        <p className="text-sm text-gray-700 whitespace-pre-wrap">{description}</p>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// State: APPROVED → check-in
// ---------------------------------------------------------------------------

type GeoState = "idle" | "locating" | "ready" | "too_far" | "denied";

function CheckinPanel({
  serviceOrderId, token, hasUnitCoords, onSuccess,
}: {
  serviceOrderId: string;
  token:          string;
  hasUnitCoords:  boolean;
  onSuccess:      () => void;
}) {
  const [geoState, setGeoState] = useState<GeoState>("idle");
  const [coords,   setCoords]   = useState<{ lat: number; lng: number } | null>(null);
  const [error,    setError]    = useState<string | null>(null);
  const [loading,  setLoading]  = useState(false);
  const [distance, setDistance] = useState<number | null>(null);

  function locate() {
    if (!navigator.geolocation) {
      setGeoState("denied");
      setError("Seu navegador não suporta geolocalização.");
      return;
    }
    setGeoState("locating");
    setError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setGeoState("ready");
      },
      () => {
        setGeoState("denied");
        setError("Permissão de localização negada. Ative no navegador e tente novamente.");
      },
      { enableHighAccuracy: true, timeout: 15_000 },
    );
  }

  async function handleStart() {
    setLoading(true);
    setError(null);
    const body: Record<string, unknown> = { token };
    if (coords) { body.lat = coords.lat; body.lng = coords.lng; }

    const res  = await fetch(`/api/service-orders/${serviceOrderId}/start-by-provider`, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify(body),
    });
    const json = await res.json().catch(() => ({}));
    setLoading(false);

    if (!res.ok) {
      if (json.code === "LOCATION_TOO_FAR") {
        const match = (json.error as string).match(/(\d+)m/);
        setDistance(match ? parseInt(match[1]) : null);
        setGeoState("too_far");
      }
      setError(json.error ?? "Erro ao iniciar. Tente novamente.");
      return;
    }
    onSuccess();
  }

  return (
    <div className="space-y-4">
      {/* Geolocalização */}
      {hasUnitCoords && (
        <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-3">
          <p className="text-sm font-semibold text-gray-900 flex items-center gap-2">
            <MapPin className="h-4 w-4 text-blue-500" />
            Verificação de presença obrigatória
          </p>
          <p className="text-xs text-gray-500">
            Você precisa estar a no máximo 200 metros da unidade para iniciar.
          </p>

          {geoState === "idle" && (
            <button
              onClick={locate}
              className="w-full py-3 rounded-lg bg-gray-100 text-sm font-medium text-gray-700 hover:bg-gray-200 transition-colors"
            >
              Capturar minha localização
            </button>
          )}
          {geoState === "locating" && (
            <div className="flex items-center gap-2 text-sm text-gray-500 py-2">
              <Loader2 className="h-4 w-4 animate-spin" /> Obtendo localização...
            </div>
          )}
          {geoState === "ready" && (
            <div className="flex items-center gap-2 text-sm text-emerald-700">
              <CheckCircle2 className="h-4 w-4" /> Localização capturada
            </div>
          )}
          {geoState === "too_far" && (
            <div className="flex items-start gap-2 text-sm text-red-700 bg-red-50 rounded-lg p-3">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <div>
                <p>Você está{distance ? ` a ${distance}m` : ""} da unidade.</p>
                <p className="text-xs mt-0.5">Aproxime-se (máx. 200m) e tente novamente.</p>
                <button onClick={locate} className="mt-2 text-xs font-medium text-red-700 underline">
                  Tentar novamente
                </button>
              </div>
            </div>
          )}
          {geoState === "denied" && (
            <div className="flex items-start gap-2 text-sm text-amber-700 bg-amber-50 rounded-lg p-3">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <p>{error}</p>
            </div>
          )}
        </div>
      )}

      {/* Erro genérico */}
      {error && geoState !== "too_far" && geoState !== "denied" && (
        <div className="bg-red-50 border border-red-100 rounded-lg p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Botão de check-in */}
      <button
        onClick={handleStart}
        disabled={loading || (hasUnitCoords && geoState !== "ready")}
        className="w-full py-4 rounded-xl bg-gray-900 text-white font-semibold text-base
                   disabled:opacity-40 disabled:cursor-not-allowed
                   active:scale-[0.98] transition-all"
      >
        {loading ? (
          <span className="flex items-center justify-center gap-2">
            <Loader2 className="h-5 w-5 animate-spin" /> Iniciando...
          </span>
        ) : "Iniciar execução"}
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// State: IN_PROGRESS → finish
// ---------------------------------------------------------------------------

function FinishPanel({
  serviceOrderId, token, onSuccess,
}: {
  serviceOrderId: string;
  token:          string;
  onSuccess:      () => void;
}) {
  const [report,  setReport]  = useState("");
  const [photos,  setPhotos]  = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  function addPhotos(files: FileList | null) {
    if (!files) return;
    const newFiles   = Array.from(files);
    const newPreviews = newFiles.map((f) => URL.createObjectURL(f));
    setPhotos((prev)    => [...prev, ...newFiles]);
    setPreviews((prev)  => [...prev, ...newPreviews]);
  }

  function removePhoto(index: number) {
    URL.revokeObjectURL(previews[index]);
    setPhotos((prev)   => prev.filter((_, i) => i !== index));
    setPreviews((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleFinish() {
    setError(null);
    if (!report.trim()) { setError("Relatório de execução obrigatório."); return; }
    if (photos.length === 0) { setError("Pelo menos 1 foto de evidência obrigatória."); return; }

    setLoading(true);

    // Captura GPS opcionalmente (non-blocking)
    let lat: number | undefined;
    let lng: number | undefined;
    try {
      await new Promise<void>((resolve) => {
        navigator.geolocation?.getCurrentPosition(
          (pos) => { lat = pos.coords.latitude; lng = pos.coords.longitude; resolve(); },
          () => resolve(),
          { timeout: 5_000 },
        );
      });
    } catch { /* GPS opcional na conclusão */ }

    const fd = new FormData();
    fd.append("token", token);
    fd.append("executionReport", report.trim());
    if (lat !== undefined) fd.append("lat", String(lat));
    if (lng !== undefined) fd.append("lng", String(lng));
    photos.forEach((f) => fd.append("photos", f));

    const res  = await fetch(`/api/service-orders/${serviceOrderId}/finish-by-provider`, {
      method: "POST",
      body:   fd,
    });
    const json = await res.json().catch(() => ({}));
    setLoading(false);

    if (!res.ok) {
      setError(json.error ?? "Erro ao concluir. Tente novamente.");
      return;
    }
    onSuccess();
  }

  return (
    <div className="space-y-5">
      {/* Fotos */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-3">
        <p className="text-sm font-semibold text-gray-900 flex items-center gap-2">
          <Camera className="h-4 w-4 text-gray-600" />
          Fotos de comprovação <span className="text-red-500">*</span>
        </p>
        <p className="text-xs text-gray-400">Tire fotos do serviço concluído. Mínimo 1 foto.</p>

        {previews.length > 0 && (
          <div className="grid grid-cols-3 gap-2">
            {previews.map((src, i) => (
              <div key={i} className="relative aspect-square">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={src} alt={`foto ${i + 1}`} className="w-full h-full object-cover rounded-lg" />
                <button
                  onClick={() => removePhoto(i)}
                  className="absolute top-1 right-1 bg-black/50 rounded-full p-0.5 text-white"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        )}

        <button
          onClick={() => fileRef.current?.click()}
          className="w-full py-3 rounded-lg border-2 border-dashed border-gray-200 text-sm text-gray-500
                     hover:border-gray-300 hover:text-gray-700 transition-colors flex items-center justify-center gap-2"
        >
          <Camera className="h-4 w-4" />
          {previews.length === 0 ? "Adicionar foto" : "Adicionar mais fotos"}
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          capture="environment"
          multiple
          className="hidden"
          onChange={(e) => addPhotos(e.target.files)}
        />
      </div>

      {/* Relatório */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-2">
        <label className="text-sm font-semibold text-gray-900 flex items-center gap-2">
          <FileText className="h-4 w-4 text-gray-600" />
          Relatório de execução <span className="text-red-500">*</span>
        </label>
        <textarea
          value={report}
          onChange={(e) => setReport(e.target.value)}
          placeholder="Descreva o que foi realizado, peças trocadas, observações..."
          rows={5}
          className="w-full rounded-lg border border-gray-200 p-3 text-sm text-gray-800
                     placeholder:text-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-900 resize-none"
        />
      </div>

      {error && (
        <div className="bg-red-50 border border-red-100 rounded-lg p-3 text-sm text-red-700 flex items-start gap-2">
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
          {error}
        </div>
      )}

      <button
        onClick={handleFinish}
        disabled={loading}
        className="w-full py-4 rounded-xl bg-emerald-600 text-white font-semibold text-base
                   disabled:opacity-40 disabled:cursor-not-allowed
                   active:scale-[0.98] transition-all"
      >
        {loading ? (
          <span className="flex items-center justify-center gap-2">
            <Loader2 className="h-5 w-5 animate-spin" /> Enviando...
          </span>
        ) : "Concluir execução"}
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function ProviderOSClient({
  serviceOrderId, osNumber, status, description, isRemote,
  scheduledDate, unitName, unitAddress, providerName,
  token, isExpired, isOperable, hasUnitCoords,
}: ProviderOSClientProps) {
  const [currentStatus, setCurrentStatus] = useState<ServiceOrderStatus>(status);
  const [done,          setDone]          = useState(false);

  // Token expirado
  if (isExpired) {
    return (
      <div className="space-y-4">
        <OSInfoCard {...{ osNumber, description, unitName, unitAddress, scheduledDate, providerName }} />
        <div className="bg-amber-50 border border-amber-100 rounded-xl p-5 text-center space-y-2">
          <AlertCircle className="h-8 w-8 text-amber-500 mx-auto" />
          <p className="font-semibold text-amber-800">Link expirado</p>
          <p className="text-sm text-amber-600">
            Este link de acesso expirou. Solicite um novo link ao gestor da unidade.
          </p>
        </div>
      </div>
    );
  }

  // OS encerrada (DONE, VALIDATED, CANCELLED, etc.)
  if (!isOperable || done) {
    const isDone = done || ["DONE", "VALIDATED"].includes(currentStatus);
    return (
      <div className="space-y-4">
        <OSInfoCard {...{ osNumber, description, unitName, unitAddress, scheduledDate, providerName }} />
        <div className={`rounded-xl border p-5 text-center space-y-2 ${
          isDone
            ? "bg-emerald-50 border-emerald-100"
            : "bg-gray-50 border-gray-200"
        }`}>
          {isDone ? (
            <>
              <CheckCircle2 className="h-8 w-8 text-emerald-500 mx-auto" />
              <p className="font-semibold text-emerald-800">Execução concluída!</p>
              <p className="text-sm text-emerald-600">
                O gestor irá validar o serviço. Obrigado!
              </p>
            </>
          ) : (
            <>
              <AlertCircle className="h-8 w-8 text-gray-400 mx-auto" />
              <p className="font-semibold text-gray-700">OS não disponível</p>
              <p className="text-sm text-gray-500">
                Esta ordem de serviço não pode ser operada neste momento.
              </p>
            </>
          )}
        </div>
        {isRemote && (
          <div className="flex items-center gap-2 text-xs text-blue-600 bg-blue-50 rounded-lg px-3 py-2">
            <Wifi className="h-3.5 w-3.5 shrink-0" /> Resolução remota
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <OSInfoCard {...{ osNumber, description, unitName, unitAddress, scheduledDate, providerName }} />

      {isRemote && (
        <div className="flex items-center gap-2 text-xs text-blue-600 bg-blue-50 rounded-lg px-3 py-2">
          <Wifi className="h-3.5 w-3.5 shrink-0" /> Resolução remota — geofencing desativado
        </div>
      )}

      {currentStatus === "APPROVED" && (
        <CheckinPanel
          serviceOrderId={serviceOrderId}
          token={token}
          hasUnitCoords={hasUnitCoords && !isRemote}
          onSuccess={() => setCurrentStatus("IN_PROGRESS")}
        />
      )}

      {currentStatus === "IN_PROGRESS" && (
        <FinishPanel
          serviceOrderId={serviceOrderId}
          token={token}
          onSuccess={() => setDone(true)}
        />
      )}
    </div>
  );
}

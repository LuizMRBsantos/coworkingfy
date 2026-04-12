// 'use client' — gerencia estado da aba ativa e renderiza conteúdo
"use client";

import { useState } from "react";
import { OSAttachmentForm } from "@/components/shared/OSAttachmentForm";
import { ActivityTimeline } from "@/components/shared/ActivityTimeline";
import {
  MapPin, Calendar, Wrench, DollarSign, AlertCircle, CheckCircle2,
  Clock, Image as ImageIcon, FileText, Wifi, ListChecks,
} from "lucide-react";
import type { Priority, ServiceOrderStatus, ServiceType, ProviderType } from "@prisma/client";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Attachment {
  id:         string;
  name:       string;
  url:        string;
  createdAt:  Date | string;
  uploadedBy: { id: string; name: string | null };
}

interface OSData {
  id:                    string;
  number:                string;
  status:                ServiceOrderStatus;
  serviceType:           ServiceType;
  description:           string;
  isRemote:              boolean;
  specialInstructions:   string | null;
  executionReport:       string | null;
  cancellationReason:    string | null;
  photos:                string[];
  value:                 { toString(): string } | null;
  scheduledDate:         Date | string | null;
  approvedAt:            Date | string | null;
  startedAt:             Date | string | null;
  completedAt:           Date | string | null;
  cancelledAt:           Date | string | null;
  validatedAt:           Date | string | null;
  createdAt:             Date | string;
  slaAttendanceDeadline: Date | string | null;
  slaResolutionDeadline: Date | string | null;
  unit:    { id: string; name: string; address: string | null; clientName: string | null; clientContact: string | null };
  space:   { id: string; name: string } | null;
  asset:   { id: string; name: string; code: string } | null;
  ticket:  { id: string; number: string; description: string; priority: Priority; createdAt: Date | string } | null;
  createdBy:  { id: string; name: string | null };
  approvedBy: { id: string; name: string | null } | null;
  provider:   { id: string; name: string; type: ProviderType; phone: string | null; email: string | null } | null;
  attachments: Attachment[];
  checklists:  { id: string; item: string; isCompleted: boolean; completedAt: Date | string | null }[];
}

interface OSTabsProps {
  os:      OSData;
  canEdit: boolean;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const PRIORITY_LABEL: Record<Priority, string> = {
  URGENT: "Crítico",
  HIGH:   "Alta",
  MEDIUM: "Média",
  LOW:    "Baixa",
};

const SERVICE_TYPE_LABEL: Record<ServiceType, string> = {
  CLEANING:   "Limpeza",
  ELECTRICAL: "Elétrica",
  HYDRAULIC:  "Hidráulica",
  OTHER:      "Outro",
};

function fmt(d: Date | string | null | undefined): string {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("pt-BR", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

function fmtDate(d: Date | string | null | undefined): string {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("pt-BR");
}

type SlaState = "ok" | "warning" | "overdue" | "done";

function getSlaState(deadline: Date | string | null, resolved: boolean): SlaState {
  if (resolved) return "done";
  if (!deadline) return "ok";
  const diff = new Date(deadline).getTime() - Date.now();
  if (diff < 0) return "overdue";
  if (diff < 2 * 60 * 60 * 1000) return "warning"; // menos de 2h
  return "ok";
}

function SlaIndicator({ label, deadline, resolved }: { label: string; deadline: Date | string | null; resolved: boolean }) {
  const state = getSlaState(deadline, resolved);
  const config = {
    done:    { icon: <CheckCircle2 className="h-4 w-4" />, color: "text-emerald-600", text: "Dentro do prazo" },
    ok:      { icon: <CheckCircle2 className="h-4 w-4" />, color: "text-emerald-600", text: deadline ? `Prazo: ${fmt(deadline)}` : "Sem prazo" },
    warning: { icon: <Clock className="h-4 w-4" />,        color: "text-amber-500",   text: `Vence: ${fmt(deadline)}` },
    overdue: { icon: <AlertCircle className="h-4 w-4" />,  color: "text-red-600",     text: `Vencido: ${fmt(deadline)}` },
  }[state];

  return (
    <div className={`flex items-center gap-1.5 text-sm font-medium ${config.color}`}>
      {config.icon}
      <span className="text-xs text-gray-500">{label}:</span>
      <span className="text-xs">{config.text}</span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tab: Resumo
// ---------------------------------------------------------------------------

function TabResumo({ os, canEdit }: { os: OSData; canEdit: boolean }) {
  // Editável apenas em DRAFT e PENDING_APPROVAL — após aprovação é somente leitura
  const isFinished = !["DRAFT", "PENDING_APPROVAL"].includes(os.status);

  return (
    <div className="space-y-8">
      {/* SLA */}
      {(os.slaAttendanceDeadline || os.slaResolutionDeadline) && (
        <div className="bg-gray-50 rounded-lg p-4 space-y-2">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">SLA</p>
          <SlaIndicator
            label="Atendimento"
            deadline={os.slaAttendanceDeadline}
            resolved={!!os.startedAt}
          />
          <SlaIndicator
            label="Resolução"
            deadline={os.slaResolutionDeadline}
            resolved={isFinished}
          />
        </div>
      )}

      {/* Grid de metadados */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <div>
          <p className="text-xs text-gray-400 uppercase tracking-wide mb-1 flex items-center gap-1">
            <MapPin className="h-3.5 w-3.5" /> Local
          </p>
          <p className="text-sm font-medium text-gray-900">{os.unit.name}</p>
          {os.unit.address && <p className="text-xs text-gray-500">{os.unit.address}</p>}
          {os.space && <p className="text-xs text-gray-500">Espaço: {os.space.name}</p>}
          {os.asset && <p className="text-xs text-gray-500">Ativo: {os.asset.code} — {os.asset.name}</p>}
        </div>

        <div>
          <p className="text-xs text-gray-400 uppercase tracking-wide mb-1 flex items-center gap-1">
            <Calendar className="h-3.5 w-3.5" /> Agendamento
          </p>
          <p className="text-sm text-gray-800">
            {os.scheduledDate ? fmtDate(os.scheduledDate) : "Sem data"}
          </p>
          {os.approvedAt && (
            <p className="text-xs text-gray-500">Aprovado: {fmtDate(os.approvedAt)}</p>
          )}
        </div>

        {os.provider && (
          <div>
            <p className="text-xs text-gray-400 uppercase tracking-wide mb-1 flex items-center gap-1">
              <Wrench className="h-3.5 w-3.5" /> Prestador
            </p>
            <p className="text-sm font-medium text-gray-900">{os.provider.name}</p>
            {os.provider.phone && <p className="text-xs text-gray-500">{os.provider.phone}</p>}
            {os.provider.email && <p className="text-xs text-gray-500">{os.provider.email}</p>}
          </div>
        )}

        {os.value && (
          <div>
            <p className="text-xs text-gray-400 uppercase tracking-wide mb-1 flex items-center gap-1">
              <DollarSign className="h-3.5 w-3.5" /> Valor
            </p>
            <p className="text-sm font-medium text-gray-900">
              {Number(os.value.toString()).toLocaleString("pt-BR", {
                style: "currency", currency: "BRL",
              })}
            </p>
          </div>
        )}
      </div>

      {/* Tipo e Descrição */}
      <div className="space-y-4">
        <div>
          <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Tipo de serviço</p>
          <p className="text-sm text-gray-800">{SERVICE_TYPE_LABEL[os.serviceType]}</p>
        </div>
        <div>
          <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Descrição do serviço</p>
          <p className="text-sm text-gray-800 whitespace-pre-wrap">{os.description}</p>
        </div>
        {os.specialInstructions && (
          <div>
            <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Instruções especiais</p>
            <p className="text-sm text-gray-800 whitespace-pre-wrap">{os.specialInstructions}</p>
          </div>
        )}
      </div>

      {/* Anexos */}
      <div>
        <p className="text-xs text-gray-400 uppercase tracking-wide mb-3">Documentos Anexados</p>
        <OSAttachmentForm
          osId={os.id}
          attachments={os.attachments}
          canEdit={canEdit && !isFinished}
        />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Checklist panel (usado na aba Execução)
// ---------------------------------------------------------------------------

function OSChecklistPanel({ osId, items, isInProgress }: {
  osId:        string;
  items:       { id: string; item: string; isCompleted: boolean }[];
  isInProgress: boolean;
}) {
  const [state, setState] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(items.map((i) => [i.id, i.isCompleted])),
  );
  const [loading, setLoading] = useState<Record<string, boolean>>({});

  async function toggle(itemId: string) {
    if (!isInProgress) return;
    const next = !state[itemId];
    setLoading((p) => ({ ...p, [itemId]: true }));
    const res = await fetch(`/api/service-orders/${osId}/checklist/${itemId}`, {
      method:  "PATCH",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ isCompleted: next }),
    });
    setLoading((p) => ({ ...p, [itemId]: false }));
    if (res.ok) setState((p) => ({ ...p, [itemId]: next }));
  }

  const done  = Object.values(state).filter(Boolean).length;
  const total = items.length;

  return (
    <div>
      <p className="text-xs text-gray-400 uppercase tracking-wide mb-3 flex items-center gap-1">
        <ListChecks className="h-3.5 w-3.5" />
        Checklist
        <span className="ml-1 font-normal text-gray-400">({done}/{total})</span>
      </p>
      <ul className="space-y-2">
        {items.map((i) => {
          const checked = state[i.id] ?? false;
          const busy    = loading[i.id] ?? false;
          return (
            <li key={i.id} className="flex items-center gap-2.5">
              <button
                type="button"
                disabled={!isInProgress || busy}
                onClick={() => toggle(i.id)}
                className={[
                  "h-4 w-4 rounded border flex items-center justify-center shrink-0 transition-colors",
                  checked
                    ? "bg-emerald-500 border-emerald-500 text-white"
                    : "border-gray-300 bg-white",
                  isInProgress && !busy ? "cursor-pointer hover:border-emerald-400" : "cursor-default opacity-60",
                ].join(" ")}
              >
                {checked && <CheckCircle2 className="h-3 w-3" />}
              </button>
              <span className={`text-sm ${checked ? "line-through text-gray-400" : "text-gray-700"}`}>
                {i.item}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tab: Execução
// ---------------------------------------------------------------------------

function TabExecucao({ os }: { os: OSData }) {
  return (
    <div className="space-y-8">
      {/* Checklist */}
      {os.checklists.length > 0 && (
        <OSChecklistPanel
          osId={os.id}
          items={os.checklists}
          isInProgress={os.status === "IN_PROGRESS"}
        />
      )}

      {/* Fotos */}
      <div>
        <p className="text-xs text-gray-400 uppercase tracking-wide mb-3 flex items-center gap-1">
          <ImageIcon className="h-3.5 w-3.5" /> Fotos de comprovação
        </p>
        {os.photos.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {os.photos.map((url, i) => (
              <a key={i} href={url} target="_blank" rel="noopener noreferrer">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={url}
                  alt={`Foto ${i + 1}`}
                  className="w-full h-36 object-cover rounded-lg border border-gray-100 hover:opacity-90 transition-opacity"
                />
              </a>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-400">Nenhuma foto adicionada.</p>
        )}
      </div>

      {/* Resolução remota */}
      {os.isRemote && (
        <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 flex items-start gap-3">
          <Wifi className="h-5 w-5 text-blue-500 mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-medium text-blue-800">Resolução remota</p>
            <p className="text-xs text-blue-600">Este chamado foi resolvido remotamente, sem visita presencial.</p>
          </div>
        </div>
      )}

      {/* Relatório de execução */}
      <div>
        <p className="text-xs text-gray-400 uppercase tracking-wide mb-1 flex items-center gap-1">
          <FileText className="h-3.5 w-3.5" /> Relatório de execução
        </p>
        {os.executionReport ? (
          <p className="text-sm text-gray-800 whitespace-pre-wrap">{os.executionReport}</p>
        ) : (
          <p className="text-sm text-gray-400">Nenhum relatório registrado.</p>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tab: Histórico
// ---------------------------------------------------------------------------

function TabHistorico({ os }: { os: OSData }) {
  const PRIORITY_COLOR: Record<Priority, string> = {
    URGENT: "text-red-600",
    HIGH:   "text-orange-500",
    MEDIUM: "text-amber-500",
    LOW:    "text-gray-500",
  };

  return (
    <div className="space-y-8">
      {/* Chamado relacionado */}
      {os.ticket ? (
        <div className="bg-gray-50 rounded-lg p-4 space-y-2">
          <p className="text-xs text-gray-400 uppercase tracking-wide mb-2">Chamado relacionado</p>
          <p className="text-sm font-mono font-semibold text-gray-900">{os.ticket.number}</p>
          <p className="text-sm text-gray-700">{os.ticket.description}</p>
          <p className={`text-xs font-medium ${PRIORITY_COLOR[os.ticket.priority]}`}>
            Prioridade: {PRIORITY_LABEL[os.ticket.priority]}
          </p>
          {(os.unit.clientName || os.unit.clientContact) && (
            <p className="text-xs text-gray-500">
              Cliente: {os.unit.clientName}{os.unit.clientContact ? ` (${os.unit.clientContact})` : ""}
            </p>
          )}
        </div>
      ) : (
        <div className="bg-blue-50 rounded-lg p-4">
          <p className="text-xs text-blue-600 font-medium">OS preventiva — gerada automaticamente pelo motor de manutenção</p>
        </div>
      )}

      {/* Linha do tempo — carregada da tabela activity_logs */}
      <ActivityTimeline entityType="SERVICE_ORDER" entityId={os.id} />

      {/* Motivo do cancelamento */}
      {os.cancellationReason && (
        <div className="bg-red-50 border border-red-100 rounded-lg p-4">
          <p className="text-xs font-medium text-red-700 uppercase tracking-wide mb-1">Motivo do cancelamento</p>
          <p className="text-sm text-red-800">{os.cancellationReason}</p>
        </div>
      )}

      {/* Responsáveis */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Criado por</p>
          <p className="text-sm text-gray-800">
            {os.createdBy.name ?? "—"}
            <span className="text-gray-400 text-xs ml-2">{fmtDate(os.createdAt)}</span>
          </p>
        </div>
        {os.approvedBy && (
          <div>
            <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Aprovado por</p>
            <p className="text-sm text-gray-800">{os.approvedBy.name ?? "—"}</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// OSTabs — componente principal
// ---------------------------------------------------------------------------

type Tab = "resumo" | "execucao" | "historico";

export function OSTabs({ os, canEdit }: OSTabsProps) {
  const [active, setActive] = useState<Tab>("resumo");

  const tabs: { id: Tab; label: string }[] = [
    { id: "resumo",   label: "Resumo" },
    { id: "execucao", label: "Execução" },
    { id: "historico", label: "Histórico" },
  ];

  return (
    <div>
      {/* Tab headers */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex gap-0">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActive(tab.id)}
              className={[
                "px-5 py-3 text-sm font-medium border-b-2 transition-colors",
                active === tab.id
                  ? "border-gray-900 text-gray-900"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300",
              ].join(" ")}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab content */}
      {active === "resumo"    && <TabResumo   os={os} canEdit={canEdit} />}
      {active === "execucao"  && <TabExecucao os={os} />}
      {active === "historico" && <TabHistorico os={os} />}
    </div>
  );
}

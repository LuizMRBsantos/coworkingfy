import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { MaintenancePlanForm } from "@/components/shared/MaintenancePlanForm";
import { PlanChecklistEditor } from "@/components/shared/PlanChecklistEditor";
import { PlanExecutionTimeline } from "@/components/shared/PlanExecutionTimeline";
import type { TimelineEntry } from "@/components/shared/PlanExecutionTimeline";
import {
  PLAN_FREQUENCY_LABEL,
  PLAN_SERVICE_TYPE_LABEL,
  PLAN_PRIORITY_LABEL,
} from "@/components/shared/MaintenancePlanCard";
import {
  ArrowLeft, AlertTriangle, CheckCircle2, Building2, Package,
  ClipboardList, Calendar, UserCog,
} from "lucide-react";
import type { PlanFrequency, ServiceOrderStatus } from "@prisma/client";

interface PageProps {
  params: Promise<{ id: string }>;
}

const OS_STATUS_LABEL: Record<ServiceOrderStatus, string> = {
  DRAFT:            "Rascunho",
  PENDING_APPROVAL: "Aguard. aprovação",
  APPROVED:         "Aprovada",
  IN_PROGRESS:      "Em andamento",
  DONE:             "Concluída",
  VALIDATED:        "Validada",
  REJECTED:         "Rejeitada",
  CANCELLED:        "Cancelada",
};

const OS_STATUS_CLASS: Record<ServiceOrderStatus, string> = {
  DRAFT:            "bg-slate-100 text-slate-700 border-none",
  PENDING_APPROVAL: "bg-amber-100 text-amber-700 border-none",
  APPROVED:         "bg-blue-100 text-blue-700 border-none",
  IN_PROGRESS:      "bg-purple-100 text-purple-700 border-none",
  DONE:             "bg-emerald-100 text-emerald-700 border-none",
  VALIDATED:        "bg-teal-100 text-teal-700 border-none",
  REJECTED:         "bg-rose-100 text-rose-700 border-none",
  CANCELLED:        "bg-gray-100 text-gray-500 border-none",
};

function addFrequency(date: Date, frequency: PlanFrequency): Date {
  const d = new Date(date);
  switch (frequency) {
    case "DAILY":         d.setDate(d.getDate() + 1);         break;
    case "WEEKLY":        d.setDate(d.getDate() + 7);         break;
    case "MONTHLY":       d.setMonth(d.getMonth() + 1);       break;
    case "QUARTERLY":     d.setMonth(d.getMonth() + 3);       break;
    case "SEMI_ANNUALLY": d.setMonth(d.getMonth() + 6);       break;
    case "ANNUALLY":      d.setFullYear(d.getFullYear() + 1); break;
  }
  return d;
}

export default async function MaintenancePlanDetailPage({ params }: PageProps) {
  const session = await auth();
  if (!session) redirect("/login");
  if (session.user.role !== "ADMIN") redirect("/dashboard");

  const { id } = await params;

  const [plan, assets, spaces, providers] = await Promise.all([
    db.maintenancePlan.findUnique({
      where: { id },
      include: {
        unit:     { select: { id: true, name: true } },
        asset:    { select: { id: true, name: true, code: true, unitId: true } },
        space:    { select: { id: true, name: true, unitId: true, type: true } },
        provider: { select: { id: true, name: true } },
        checklists: { orderBy: { id: "asc" } },
        serviceOrders: {
          orderBy: { createdAt: "asc" },
          select: {
            id:          true,
            number:      true,
            status:      true,
            createdAt:   true,
            completedAt: true,
          },
        },
      },
    }),
    db.asset.findMany({
      select: { id: true, name: true, code: true, unitId: true },
      where:  { status: { not: "DECOMMISSIONED" } },
      orderBy: { code: "asc" },
    }),
    db.space.findMany({
      select: { id: true, name: true, unitId: true, type: true },
      orderBy: { name: "asc" },
    }),
    db.provider.findMany({
      select:  { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);

  if (!plan) notFound();

  const nextRun = new Date(plan.nextRunAt);
  const now     = new Date();
  const overdue = nextRun < now;
  const soon    = !overdue && nextRun.getTime() - now.getTime() < 7 * 24 * 60 * 60 * 1000;

  // Construir timeline: slots esperados desde a primeira OS (ou criação do plano) até hoje + próximos 2
  const timelineEntries: TimelineEntry[] = [];
  if (plan.serviceOrders.length > 0 || plan.lastRunAt) {
    // Ponto de partida: data da primeira OS criada
    const firstOs   = plan.serviceOrders[0];
    const startDate = firstOs ? new Date(firstOs.createdAt) : new Date(plan.createdAt);
    // Reconstruir slots avançando por frequência
    let slot = new Date(startDate);
    slot.setHours(0, 0, 0, 0);
    const today = new Date();
    today.setHours(23, 59, 59, 999);

    // Mapear OS por posição na timeline (aproximação por ordem de criação)
    const orderedOs = [...plan.serviceOrders];
    let osIdx = 0;

    while (slot <= addFrequency(today, plan.frequency)) {
      const os = orderedOs[osIdx];
      // Associa a OS ao slot se foi criada próxima desta data (dentro da janela da frequência)
      const nextSlot = addFrequency(slot, plan.frequency);
      const osMatchesSlot = os && new Date(os.createdAt) >= slot && new Date(os.createdAt) < nextSlot;
      timelineEntries.push({
        expectedDate: slot.toISOString(),
        os: osMatchesSlot ? { id: os.id, number: os.number, status: os.status } : undefined,
      });
      if (osMatchesSlot) osIdx++;
      slot = addFrequency(slot, plan.frequency);
    }
  }

  const defaultValues = {
    unitId:      plan.unitId,
    assetId:     plan.assetId ?? undefined,
    spaceId:     plan.spaceId ?? undefined,
    providerId:  plan.providerId ?? undefined,
    name:        plan.name,
    description: plan.description ?? undefined,
    frequency:   plan.frequency,
    serviceType: plan.serviceType,
    priority:    plan.priority,
    nextRunAt:   plan.nextRunAt.toISOString().slice(0, 10),
    isActive:    plan.isActive,
  };

  return (
    <div className="max-w-4xl space-y-8">
      {/* Cabeçalho */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/admin/maintenance-plans">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-1" />
              Voltar
            </Button>
          </Link>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-bold text-gray-900">{plan.name}</h1>
              {!plan.isActive && (
                <Badge className="bg-gray-200 text-gray-500 border-none rounded-full">Inativo</Badge>
              )}
            </div>
            <div className="flex items-center gap-3 mt-1 text-sm text-gray-500">
              <span>{PLAN_FREQUENCY_LABEL[plan.frequency]}</span>
              <span>·</span>
              <span>{PLAN_SERVICE_TYPE_LABEL[plan.serviceType]}</span>
              <span>·</span>
              <span>{PLAN_PRIORITY_LABEL[plan.priority]}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Info + histórico */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Dados */}
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardContent className="pt-5 grid grid-cols-2 sm:grid-cols-3 gap-5">
              <div>
                <p className="text-xs text-gray-400 uppercase tracking-wide mb-0.5">Unidade</p>
                <p className="text-sm text-gray-800 flex items-center gap-1">
                  <Building2 className="h-3.5 w-3.5 text-gray-400" />
                  {plan.unit.name}
                </p>
              </div>
              {plan.asset && (
                <div>
                  <p className="text-xs text-gray-400 uppercase tracking-wide mb-0.5">Ativo</p>
                  <p className="text-sm text-gray-800 flex items-center gap-1">
                    <Package className="h-3.5 w-3.5 text-gray-400" />
                    {plan.asset.code} — {plan.asset.name}
                  </p>
                </div>
              )}
              {plan.space && (
                <div>
                  <p className="text-xs text-gray-400 uppercase tracking-wide mb-0.5">Espaço</p>
                  <p className="text-sm text-gray-800">{plan.space.name}</p>
                </div>
              )}
              {plan.provider && (
                <div>
                  <p className="text-xs text-gray-400 uppercase tracking-wide mb-0.5">Prestador padrão</p>
                  <p className="text-sm text-gray-800 flex items-center gap-1">
                    <UserCog className="h-3.5 w-3.5 text-gray-400" />
                    {plan.provider.name}
                  </p>
                </div>
              )}
              <div>
                <p className="text-xs text-gray-400 uppercase tracking-wide mb-0.5">Última execução</p>
                <p className="text-sm text-gray-800">
                  {plan.lastRunAt ? new Date(plan.lastRunAt).toLocaleDateString("pt-BR") : "Nunca"}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-400 uppercase tracking-wide mb-0.5">Próxima execução</p>
                <p className={`text-sm font-medium ${overdue ? "text-red-600" : soon ? "text-amber-600" : "text-emerald-700"} flex items-center gap-1`}>
                  {overdue
                    ? <AlertTriangle className="h-3.5 w-3.5" />
                    : <CheckCircle2 className="h-3.5 w-3.5" />
                  }
                  {new Date(plan.nextRunAt).toLocaleDateString("pt-BR")}
                </p>
              </div>
            </CardContent>
          </Card>

          {plan.description && (
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Descrição</p>
              <p className="text-sm text-gray-700">{plan.description}</p>
            </div>
          )}
        </div>

        {/* Estatísticas */}
        <Card className="bg-gray-50 border-gray-100">
          <CardContent className="pt-5">
            <p className="text-xs text-gray-400 uppercase tracking-wide mb-3 flex items-center gap-1">
              <ClipboardList className="h-3.5 w-3.5" /> Execuções recentes
            </p>
            {plan.serviceOrders.length === 0 ? (
              <p className="text-xs text-gray-400">Nenhuma OS gerada ainda.</p>
            ) : (
              <ul className="space-y-2">
                {plan.serviceOrders.map((os) => (
                  <li key={os.id}>
                    <Link
                      href={`/dashboard/admin/service-orders/${os.id}`}
                      className="block hover:bg-gray-100 rounded p-1.5 -mx-1.5 transition-colors"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-mono font-semibold text-gray-700">{os.number}</span>
                        <Badge className={`${OS_STATUS_CLASS[os.status]} text-xs rounded-full`}>
                          {OS_STATUS_LABEL[os.status]}
                        </Badge>
                      </div>
                      <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
                        <Calendar className="h-3 w-3" />
                        {new Date(os.createdAt).toLocaleDateString("pt-BR")}
                      </p>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Checklist do plano */}
      <div>
        <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">
          Checklist
        </h2>
        <PlanChecklistEditor
          planId={plan.id}
          initial={plan.checklists.map((c) => ({ id: c.id, item: c.item }))}
        />
      </div>

      {/* Timeline de execuções */}
      <div>
        <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3 flex items-center gap-1.5">
          <Calendar className="h-4 w-4 text-gray-400" />
          Histórico de execuções
        </h2>
        <Card>
          <CardContent className="pt-4">
            <PlanExecutionTimeline entries={timelineEntries} />
          </CardContent>
        </Card>
      </div>

      {/* Formulário de edição */}
      <div>
        <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">
          Editar plano
        </h2>
        <MaintenancePlanForm
          planId={plan.id}
          defaultValues={defaultValues}
          units={[plan.unit]}
          assets={assets}
          spaces={spaces}
          providers={providers}
          backHref="/dashboard/admin/maintenance-plans"
        />
      </div>
    </div>
  );
}

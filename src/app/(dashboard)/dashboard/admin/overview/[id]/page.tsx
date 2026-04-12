import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { computeHealthScore } from "@/lib/healthScore";
import {
  ArrowLeft, AlertTriangle, CheckCircle2, Clock,
  FileText, ClipboardList, Package, Users, Wrench,
  Building2, Phone, Mail, ShoppingCart, DollarSign,
} from "lucide-react";
import { PURCHASE_CATEGORY_LABEL, PURCHASE_CATEGORY_CLASS } from "@/components/shared/PurchaseForm";
import type { Priority, ServiceOrderStatus, TicketStatus, AssetStatus, PurchaseCategory } from "@prisma/client";

interface PageProps {
  params: Promise<{ id: string }>;
}

const PRIORITY_LABEL: Record<Priority, string> = {
  URGENT: "Crítico", HIGH: "Alta", MEDIUM: "Média", LOW: "Baixa",
};
const PRIORITY_CLASS: Record<Priority, string> = {
  URGENT: "bg-red-100 text-red-700 border-none",
  HIGH:   "bg-orange-100 text-orange-700 border-none",
  MEDIUM: "bg-blue-100 text-blue-700 border-none",
  LOW:    "bg-gray-100 text-gray-600 border-none",
};
const OS_STATUS_LABEL: Record<ServiceOrderStatus, string> = {
  DRAFT: "Rascunho", PENDING_APPROVAL: "Aguard. aprovação", APPROVED: "Aprovada",
  IN_PROGRESS: "Em andamento", DONE: "Concluída", VALIDATED: "Validada",
  REJECTED: "Rejeitada", CANCELLED: "Cancelada",
};
const OS_STATUS_CLASS: Record<ServiceOrderStatus, string> = {
  DRAFT: "bg-slate-100 text-slate-700 border-none",
  PENDING_APPROVAL: "bg-amber-100 text-amber-700 border-none",
  APPROVED: "bg-blue-100 text-blue-700 border-none",
  IN_PROGRESS: "bg-purple-100 text-purple-700 border-none",
  DONE: "bg-emerald-100 text-emerald-700 border-none",
  VALIDATED: "bg-teal-100 text-teal-700 border-none",
  REJECTED: "bg-rose-100 text-rose-700 border-none",
  CANCELLED: "bg-gray-100 text-gray-500 border-none",
};
const TICKET_STATUS_LABEL: Record<TicketStatus, string> = {
  OPEN: "Aberto", IN_PROGRESS: "Em andamento", PENDING_CLOSE: "Ag. fechamento", CLOSED: "Fechado",
};
const ASSET_STATUS_CLASS: Record<AssetStatus, string> = {
  ACTIVE: "bg-emerald-100 text-emerald-700 border-none",
  INACTIVE: "bg-gray-100 text-gray-500 border-none",
  MAINTENANCE: "bg-amber-100 text-amber-700 border-none",
  UNDER_MAINTENANCE: "bg-amber-100 text-amber-700 border-none",
  DECOMMISSIONED: "bg-red-100 text-red-500 border-none",
};
const ASSET_STATUS_LABEL: Record<AssetStatus, string> = {
  ACTIVE: "Ativo", INACTIVE: "Inativo", MAINTENANCE: "Manutenção",
  UNDER_MAINTENANCE: "Em manutenção", DECOMMISSIONED: "Baixado",
};

const BAND_COLOR = { green: "text-emerald-600", yellow: "text-amber-500", red: "text-red-600", none: "text-gray-400" };
const BAND_LABEL = { green: "Tudo em dia", yellow: "Atenção", red: "Intervenção", none: "Sem dados" };

function SectionHeader({ icon: Icon, title, count, href }: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  count: number;
  href?: string;
}) {
  return (
    <div className="flex items-center justify-between mb-3">
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide flex items-center gap-1.5">
        <Icon className="h-3.5 w-3.5" />
        {title} ({count})
      </p>
      {href && (
        <Link href={href} className="text-xs text-gray-400 hover:text-gray-600 underline underline-offset-2">
          Ver todos
        </Link>
      )}
    </div>
  );
}

export default async function UnitOverviewPage({ params }: PageProps) {
  const session = await auth();
  if (!session) redirect("/login");
  if (session.user.role !== "ADMIN") redirect("/dashboard");

  const { id } = await params;

  const unit = await db.unit.findUnique({
    where: { id },
    include: {
      tickets: {
        where:   { status: { not: "CLOSED" } },
        orderBy: [{ priority: "desc" }, { createdAt: "desc" }],
        take:    20,
        select: {
          id: true, number: true, description: true, priority: true, status: true, createdAt: true,
        },
      },
      serviceOrders: {
        where:   { status: { in: ["DRAFT","PENDING_APPROVAL","APPROVED","IN_PROGRESS"] } },
        orderBy: { createdAt: "desc" },
        take:    20,
        select: {
          id: true, number: true, status: true,
          slaResolutionDeadline: true, slaAttendanceDeadline: true,
          startedAt: true, createdAt: true,
          provider: { select: { name: true } },
        },
      },
      assets: {
        where:   { status: { not: "DECOMMISSIONED" } },
        orderBy: { code: "asc" },
        take:    20,
        select: {
          id: true, code: true, name: true, type: true, status: true,
          warrantyExpiresAt: true,
        },
      },
      maintenancePlans: {
        where:   { isActive: true },
        orderBy: { nextRunAt: "asc" },
        take:    15,
        select: { id: true, name: true, nextRunAt: true, frequency: true, isActive: true },
      },
      providers: {
        where:   { status: "ACTIVE" },
        orderBy: { name: "asc" },
        take:    10,
        select: { id: true, name: true, specialty: true, phone: true, email: true, type: true },
      },
    },
  });

  if (!unit) notFound();

  // Custos: OS + compras dos últimos 12 meses
  const twelveMonthsAgo = new Date();
  twelveMonthsAgo.setFullYear(twelveMonthsAgo.getFullYear() - 1);
  twelveMonthsAgo.setDate(1);
  twelveMonthsAgo.setHours(0, 0, 0, 0);

  const [osCostAgg, purchaseTotals, recentPurchases] = await Promise.all([
    db.serviceOrder.aggregate({
      where: { unitId: id, value: { not: null } },
      _sum:  { value: true },
    }),
    db.purchase.groupBy({
      by:    ["category"],
      where: { unitId: id },
      _sum:  { value: true },
    }),
    db.purchase.findMany({
      where:   { unitId: id },
      orderBy: { purchasedAt: "desc" },
      take:    5,
      select:  { id: true, category: true, description: true, value: true, purchasedAt: true },
    }),
  ]);

  const totalOS       = Number(osCostAgg._sum.value ?? 0);
  const totalPurchases = purchaseTotals.reduce((acc, t) => acc + Number(t._sum.value ?? 0), 0);
  const totalGeral    = totalOS + totalPurchases;

  function fmt(v: number) {
    return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  }

  // Busca para score
  const scoreOrders = await db.serviceOrder.findMany({
    where: { unitId: id },
    select: {
      status: true, slaAttendanceDeadline: true, slaResolutionDeadline: true,
      startedAt: true, completedAt: true, validatedAt: true, createdAt: true,
    },
  });
  const health = computeHealthScore(unit.tickets, scoreOrders, unit.maintenancePlans);

  const now = new Date();

  function slaState(os: { slaResolutionDeadline: Date | null; slaAttendanceDeadline: Date | null; startedAt: Date | null }) {
    if (os.slaResolutionDeadline && os.slaResolutionDeadline < now) return "breached";
    if (os.slaAttendanceDeadline && os.slaAttendanceDeadline < now && !os.startedAt) return "attention";
    return "ok";
  }

  const SERVICE_TYPE_LABEL: Record<string, string> = {
    CLEANING: "Limpeza", ELECTRICAL: "Elétrica", HYDRAULIC: "Hidráulica", OTHER: "Outro",
  };

  return (
    <div className="space-y-6 max-w-6xl">
      {/* Cabeçalho */}
      <div className="flex items-start gap-4">
        <Link href="/dashboard/admin/overview">
          <button className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800 transition-colors mt-1">
            <ArrowLeft className="h-4 w-4" />
            Voltar
          </button>
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-semibold text-gray-900 flex items-center gap-2">
              <Building2 className="h-5 w-5 text-gray-400" />
              {unit.name}
            </h1>
            <div className={`text-2xl font-bold ${BAND_COLOR[health.band]}`}>
              {health.band !== "none" && <>{health.score} <span className="text-sm font-normal">{BAND_LABEL[health.band]}</span></>}
            </div>
          </div>
          {(unit.address || unit.clientName) && (
            <p className="text-sm text-gray-500 mt-0.5">
              {unit.clientName && <span className="mr-3">{unit.clientName}</span>}
              {unit.address && <span>{unit.address}</span>}
            </p>
          )}
        </div>

        {/* Badges de alerta */}
        <div className="flex flex-wrap gap-2 shrink-0">
          {health.urgentOpen > 0 && (
            <span className="inline-flex items-center gap-1 rounded-full bg-red-100 text-red-700 text-xs font-semibold px-2.5 py-1">
              <AlertTriangle className="h-3.5 w-3.5" /> {health.urgentOpen} Crítico
            </span>
          )}
          {health.slaBreached > 0 && (
            <span className="inline-flex items-center gap-1 rounded-full bg-purple-100 text-purple-700 text-xs font-semibold px-2.5 py-1">
              <Clock className="h-3.5 w-3.5" /> {health.slaBreached} SLA vencido
            </span>
          )}
          {health.pmocOverdue > 0 && (
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 text-amber-700 text-xs font-semibold px-2.5 py-1">
              <Wrench className="h-3.5 w-3.5" /> {health.pmocOverdue} PMOC vencido
            </span>
          )}
        </div>
      </div>

      {/* Grid principal */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

        {/* Tickets abertos */}
        <Card>
          <CardContent className="pt-5">
            <SectionHeader
              icon={FileText}
              title="Tickets abertos"
              count={unit.tickets.length}
              href={`/dashboard/admin/tickets?unitId=${id}`}
            />
            {unit.tickets.length === 0 ? (
              <p className="text-xs text-gray-400 flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" /> Nenhum ticket aberto
              </p>
            ) : (
              <div className="space-y-1.5">
                {unit.tickets.map((t) => (
                  <Link key={t.id} href={`/dashboard/admin/tickets/${t.id}`}
                    className="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-50 transition-colors">
                    <Badge className={`shrink-0 text-xs rounded-full ${PRIORITY_CLASS[t.priority]}`}>
                      {PRIORITY_LABEL[t.priority]}
                    </Badge>
                    <span className="text-xs text-gray-700 truncate flex-1">{t.description}</span>
                    <span className="text-xs text-gray-400 font-mono shrink-0">{t.number}</span>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* OS ativas */}
        <Card>
          <CardContent className="pt-5">
            <SectionHeader
              icon={ClipboardList}
              title="Ordens de serviço ativas"
              count={unit.serviceOrders.length}
              href={`/dashboard/admin/service-orders?unitId=${id}`}
            />
            {unit.serviceOrders.length === 0 ? (
              <p className="text-xs text-gray-400 flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" /> Sem OS ativas
              </p>
            ) : (
              <div className="space-y-1.5">
                {unit.serviceOrders.map((os) => {
                  const st = slaState(os);
                  return (
                    <Link key={os.id} href={`/dashboard/admin/service-orders/${os.id}`}
                      className="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-50 transition-colors">
                      {st === "breached"  && <AlertTriangle className="h-3.5 w-3.5 text-red-500 shrink-0" />}
                      {st === "attention" && <Clock className="h-3.5 w-3.5 text-amber-500 shrink-0" />}
                      {st === "ok"        && <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0" />}
                      <span className="text-xs font-mono text-gray-700">{os.number}</span>
                      <Badge className={`text-xs rounded-full ${OS_STATUS_CLASS[os.status]}`}>
                        {OS_STATUS_LABEL[os.status]}
                      </Badge>
                      {os.provider && (
                        <span className="text-xs text-gray-400 truncate ml-auto">{os.provider.name}</span>
                      )}
                    </Link>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Planos de manutenção */}
        <Card>
          <CardContent className="pt-5">
            <SectionHeader
              icon={Wrench}
              title="PMOC — próximas manutenções"
              count={unit.maintenancePlans.length}
              href={`/dashboard/admin/maintenance-plans?unitId=${id}`}
            />
            {unit.maintenancePlans.length === 0 ? (
              <p className="text-xs text-gray-400">Nenhum plano ativo.</p>
            ) : (
              <div className="space-y-1.5">
                {unit.maintenancePlans.map((plan) => {
                  const overdue = new Date(plan.nextRunAt) < now;
                  const soon    = !overdue && new Date(plan.nextRunAt).getTime() - now.getTime() < 7 * 24 * 60 * 60 * 1000;
                  return (
                    <Link key={plan.id} href={`/dashboard/admin/maintenance-plans/${plan.id}`}
                      className="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-50 transition-colors">
                      {overdue
                        ? <AlertTriangle className="h-3.5 w-3.5 text-red-500 shrink-0" />
                        : soon
                        ? <Clock className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                        : <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                      }
                      <span className="text-xs text-gray-700 truncate flex-1">{plan.name}</span>
                      <span className={`text-xs shrink-0 font-medium ${overdue ? "text-red-600" : soon ? "text-amber-600" : "text-gray-400"}`}>
                        {new Date(plan.nextRunAt).toLocaleDateString("pt-BR")}
                      </span>
                    </Link>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Equipamentos */}
        <Card>
          <CardContent className="pt-5">
            <SectionHeader
              icon={Package}
              title="Equipamentos"
              count={unit.assets.length}
              href={`/dashboard/admin/assets?unitId=${id}`}
            />
            {unit.assets.length === 0 ? (
              <p className="text-xs text-gray-400">Nenhum equipamento cadastrado.</p>
            ) : (
              <div className="space-y-1.5">
                {unit.assets.map((asset) => {
                  const warrantyExpired = asset.warrantyExpiresAt && new Date(asset.warrantyExpiresAt) < now;
                  return (
                    <Link key={asset.id} href={`/dashboard/admin/assets/${asset.id}`}
                      className="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-50 transition-colors">
                      <span className="text-xs font-mono text-gray-500 shrink-0">{asset.code}</span>
                      <span className="text-xs text-gray-700 truncate flex-1">{asset.name}</span>
                      {warrantyExpired && (
                        <AlertTriangle className="h-3 w-3 text-amber-400 shrink-0" aria-label="Garantia vencida" />
                      )}
                      <Badge className={`text-xs rounded-full shrink-0 ${ASSET_STATUS_CLASS[asset.status]}`}>
                        {ASSET_STATUS_LABEL[asset.status]}
                      </Badge>
                    </Link>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Custos */}
        <Card className="lg:col-span-2">
          <CardContent className="pt-5">
            <div className="flex items-center justify-between mb-4">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide flex items-center gap-1.5">
                <DollarSign className="h-3.5 w-3.5" /> Custos acumulados (total)
              </p>
              <Link href={`/dashboard/admin/purchases?unitId=${id}`} className="text-xs text-gray-400 hover:text-gray-600 underline underline-offset-2">
                Ver compras
              </Link>
            </div>

            {/* Totais */}
            <div className="grid grid-cols-3 gap-3 mb-4">
              <div className="rounded-lg bg-gray-50 p-3">
                <p className="text-[10px] text-gray-400 uppercase tracking-wide mb-1">Total geral</p>
                <p className="text-lg font-bold text-gray-900">{fmt(totalGeral)}</p>
              </div>
              <div className="rounded-lg bg-blue-50 p-3">
                <p className="text-[10px] text-blue-500 uppercase tracking-wide mb-1">Serviços (OS)</p>
                <p className="text-lg font-bold text-blue-700">{fmt(totalOS)}</p>
              </div>
              <div className="rounded-lg bg-amber-50 p-3">
                <p className="text-[10px] text-amber-500 uppercase tracking-wide mb-1">Insumos</p>
                <p className="text-lg font-bold text-amber-700">{fmt(totalPurchases)}</p>
              </div>
            </div>

            {/* Breakdown por categoria de compra */}
            {purchaseTotals.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-4">
                {purchaseTotals.map((t) => (
                  <span key={t.category} className={`inline-flex items-center gap-1 rounded-full text-xs px-2.5 py-1 ${PURCHASE_CATEGORY_CLASS[t.category as PurchaseCategory]}`}>
                    {PURCHASE_CATEGORY_LABEL[t.category as PurchaseCategory]}: {fmt(Number(t._sum.value ?? 0))}
                  </span>
                ))}
              </div>
            )}

            {/* Últimas compras */}
            {recentPurchases.length > 0 && (
              <div>
                <p className="text-[10px] text-gray-400 uppercase tracking-wide mb-2 flex items-center gap-1">
                  <ShoppingCart className="h-3 w-3" /> Últimas compras
                </p>
                <div className="space-y-1">
                  {recentPurchases.map((p) => (
                    <Link key={p.id} href={`/dashboard/admin/purchases/${p.id}`}
                      className="flex items-center gap-2 p-1.5 rounded hover:bg-gray-50 transition-colors">
                      <Badge className={`shrink-0 text-[10px] rounded-full ${PURCHASE_CATEGORY_CLASS[p.category]}`}>
                        {PURCHASE_CATEGORY_LABEL[p.category]}
                      </Badge>
                      <span className="text-xs text-gray-700 truncate flex-1">{p.description}</span>
                      <span className="text-xs font-semibold text-gray-700 shrink-0">{fmt(Number(p.value))}</span>
                      <span className="text-xs text-gray-400 shrink-0">{new Date(p.purchasedAt).toLocaleDateString("pt-BR")}</span>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Prestadores */}
        <Card className="lg:col-span-2">
          <CardContent className="pt-5">
            <SectionHeader
              icon={Users}
              title="Prestadores ativos"
              count={unit.providers.length}
              href={`/dashboard/admin/providers?unitId=${id}`}
            />
            {unit.providers.length === 0 ? (
              <p className="text-xs text-gray-400">Nenhum prestador cadastrado.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {unit.providers.map((p) => (
                  <Link key={p.id} href={`/dashboard/admin/providers/${p.id}`}
                    className="flex items-start gap-3 p-3 rounded-lg border border-gray-100 hover:bg-gray-50 transition-colors">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-gray-800">{p.name}</p>
                      <p className="text-xs text-gray-400">{SERVICE_TYPE_LABEL[p.specialty]}</p>
                    </div>
                    <div className="text-right shrink-0 space-y-0.5">
                      {p.phone && (
                        <p className="text-xs text-gray-500 flex items-center gap-1 justify-end">
                          <Phone className="h-2.5 w-2.5" />{p.phone}
                        </p>
                      )}
                      {p.email && (
                        <p className="text-xs text-gray-400 flex items-center gap-1 justify-end">
                          <Mail className="h-2.5 w-2.5" />{p.email}
                        </p>
                      )}
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { AssetForm } from "@/components/shared/AssetForm";
import {
  ASSET_TYPE_LABEL,
  ASSET_STATUS_LABEL,
  ASSET_STATUS_CLASS,
} from "@/components/shared/AssetCard";
import {
  ArrowLeft, Tag, Building2, Calendar, DollarSign,
  ClipboardList, Wrench, AlertTriangle, CheckCircle2,
} from "lucide-react";
import type { Priority, ServiceOrderStatus } from "@prisma/client";

interface PageProps {
  params: Promise<{ id: string }>;
}

const PRIORITY_LABEL: Record<Priority, string> = {
  URGENT: "Crítico", HIGH: "Alta", MEDIUM: "Média", LOW: "Baixa",
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

function DetailRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs text-gray-400 uppercase tracking-wide mb-0.5">{label}</p>
      <div className="text-sm text-gray-800">{children}</div>
    </div>
  );
}

export default async function AssetDetailPage({ params }: PageProps) {
  const session = await auth();
  if (!session) redirect("/login");
  if (session.user.role !== "ADMIN") redirect("/dashboard");

  const { id } = await params;

  const [asset, spaces] = await Promise.all([
    db.asset.findUnique({
      where: { id },
      include: {
        unit:  { select: { id: true, name: true } },
        space: { select: { id: true, name: true } },
        serviceOrders: {
          orderBy: { createdAt: "desc" },
          take: 20,
          include: {
            ticket:    { select: { number: true, priority: true } },
            createdBy: { select: { name: true } },
            provider:  { select: { name: true } },
          },
        },
        maintenancePlans: {
          where:   { isActive: true },
          orderBy: { nextRunAt: "asc" },
          take: 5,
        },
      },
    }),
    db.space.findMany({
      select: { id: true, name: true, unitId: true, type: true },
      orderBy: { name: "asc" },
    }),
  ]);

  if (!asset) notFound();

  // Custo acumulado
  const costAgg = await db.serviceOrder.aggregate({
    where: { assetId: id, value: { not: null } },
    _sum:  { value: true },
  });
  const accumulatedCost = costAgg._sum.value ? Number(costAgg._sum.value) : 0;

  const warrantyExpired    = asset.warrantyExpiresAt && new Date(asset.warrantyExpiresAt) < new Date();
  const warrantyExpiringSoon =
    !warrantyExpired && asset.warrantyExpiresAt &&
    new Date(asset.warrantyExpiresAt).getTime() - Date.now() < 30 * 24 * 60 * 60 * 1000;

  return (
    <div className="max-w-4xl space-y-8">
      {/* Cabeçalho */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/admin/assets">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-1" />
              Voltar
            </Button>
          </Link>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-xl font-bold text-gray-900 flex items-center gap-1.5">
                <Tag className="h-4 w-4 text-gray-400" />
                {asset.code}
              </span>
              <Badge className={`rounded-full ${ASSET_STATUS_CLASS[asset.status]}`}>
                {ASSET_STATUS_LABEL[asset.status]}
              </Badge>
              {warrantyExpired && (
                <span className="flex items-center gap-1 text-xs text-red-600 font-medium">
                  <AlertTriangle className="h-3.5 w-3.5" />
                  Garantia vencida
                </span>
              )}
              {warrantyExpiringSoon && (
                <span className="flex items-center gap-1 text-xs text-amber-600 font-medium">
                  <AlertTriangle className="h-3.5 w-3.5" />
                  Garantia vencendo em breve
                </span>
              )}
            </div>
            <p className="text-sm text-gray-700 mt-0.5">{asset.name}</p>
            <p className="text-xs text-gray-400">{ASSET_TYPE_LABEL[asset.type]}</p>
          </div>
        </div>
      </div>

      {/* Dados cadastrais + estatísticas */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Coluna esquerda: dados */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardContent className="pt-5 grid grid-cols-2 sm:grid-cols-3 gap-5">
              <DetailRow label="Unidade">
                <span className="flex items-center gap-1">
                  <Building2 className="h-3.5 w-3.5 text-gray-400" />
                  {asset.unit.name}
                </span>
              </DetailRow>
              {asset.space && (
                <DetailRow label="Espaço">{asset.space.name}</DetailRow>
              )}
              {asset.brand && <DetailRow label="Fabricante">{asset.brand}</DetailRow>}
              {asset.assetModel && <DetailRow label="Modelo">{asset.assetModel}</DetailRow>}
              {asset.serialNumber && <DetailRow label="Nº de série">{asset.serialNumber}</DetailRow>}
              {asset.purchasedAt && (
                <DetailRow label="Compra">
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3.5 w-3.5 text-gray-400" />
                    {new Date(asset.purchasedAt).toLocaleDateString("pt-BR")}
                  </span>
                </DetailRow>
              )}
              {asset.warrantyExpiresAt && (
                <DetailRow label="Garantia até">
                  <span className={warrantyExpired ? "text-red-600 font-medium" : warrantyExpiringSoon ? "text-amber-600 font-medium" : ""}>
                    {new Date(asset.warrantyExpiresAt).toLocaleDateString("pt-BR")}
                  </span>
                </DetailRow>
              )}
            </CardContent>
          </Card>

          {asset.description && (
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Descrição</p>
              <p className="text-sm text-gray-700">{asset.description}</p>
            </div>
          )}
          {asset.notes && (
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Notas internas</p>
              <p className="text-sm text-gray-700 whitespace-pre-wrap">{asset.notes}</p>
            </div>
          )}
        </div>

        {/* Coluna direita: estatísticas */}
        <div className="space-y-4">
          <Card className="bg-gray-50 border-gray-100">
            <CardContent className="pt-5 space-y-4">
              <div>
                <p className="text-xs text-gray-400 uppercase tracking-wide mb-1 flex items-center gap-1">
                  <DollarSign className="h-3.5 w-3.5" /> Custo acumulado
                </p>
                <p className="text-2xl font-bold text-gray-900">
                  {accumulatedCost.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                </p>
                <p className="text-xs text-gray-400">{asset.serviceOrders.length} OS registradas</p>
              </div>

              {asset.maintenancePlans.length > 0 && (
                <div>
                  <p className="text-xs text-gray-400 uppercase tracking-wide mb-2 flex items-center gap-1">
                    <Wrench className="h-3.5 w-3.5" /> Próximas manutenções
                  </p>
                  <ul className="space-y-2">
                    {asset.maintenancePlans.map((plan) => {
                      const overdue = new Date(plan.nextRunAt) < new Date();
                      return (
                        <li key={plan.id} className="flex items-center gap-2">
                          {overdue
                            ? <AlertTriangle className="h-3.5 w-3.5 text-red-500 shrink-0" />
                            : <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                          }
                          <div className="min-w-0">
                            <p className="text-xs font-medium text-gray-800 truncate">{plan.name}</p>
                            <p className={`text-xs ${overdue ? "text-red-600" : "text-gray-400"}`}>
                              {new Date(plan.nextRunAt).toLocaleDateString("pt-BR")}
                            </p>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Histórico de OS */}
      <div>
        <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3 flex items-center gap-2">
          <ClipboardList className="h-4 w-4" />
          Histórico de Ordens de Serviço
        </h2>
        {asset.serviceOrders.length === 0 ? (
          <p className="text-sm text-gray-400">Nenhuma OS vinculada a este ativo.</p>
        ) : (
          <div className="space-y-2">
            {asset.serviceOrders.map((os) => (
              <Link key={os.id} href={`/dashboard/admin/service-orders/${os.id}`} className="block">
                <Card className="hover:border-gray-300 transition-colors cursor-pointer border-gray-100">
                  <CardContent className="p-4 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3 min-w-0">
                      <Badge className={`shrink-0 rounded-full text-xs ${OS_STATUS_CLASS[os.status]}`}>
                        {OS_STATUS_LABEL[os.status]}
                      </Badge>
                      <div className="min-w-0">
                        <p className="text-xs font-mono font-semibold text-gray-900">
                          {os.ticket ? (
                            <>
                              {os.ticket.number}
                              <span className="text-gray-400 font-sans font-normal ml-2">
                                {PRIORITY_LABEL[os.ticket.priority]}
                              </span>
                            </>
                          ) : (
                            <span className="text-blue-600 font-sans font-normal">Preventiva</span>
                          )}
                        </p>
                        {os.provider && (
                          <p className="text-xs text-gray-500 truncate">{os.provider.name}</p>
                        )}
                      </div>
                    </div>
                    <div className="text-right shrink-0 text-xs text-gray-400">
                      {new Date(os.createdAt).toLocaleDateString("pt-BR")}
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Formulário de edição */}
      <div>
        <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">
          Editar ativo
        </h2>
        <AssetForm
          assetId={asset.id}
          defaultValues={{
            unitId:            asset.unitId,
            spaceId:           asset.spaceId ?? undefined,
            code:              asset.code,
            name:              asset.name,
            description:       asset.description ?? undefined,
            type:              asset.type,
            brand:             asset.brand ?? undefined,
            assetModel:        asset.assetModel ?? undefined,
            serialNumber:      asset.serialNumber ?? undefined,
            purchasedAt:       asset.purchasedAt       ? asset.purchasedAt.toISOString().slice(0, 10)       : undefined,
            warrantyExpiresAt: asset.warrantyExpiresAt ? asset.warrantyExpiresAt.toISOString().slice(0, 10) : undefined,
            notes:             asset.notes ?? undefined,
            status:            asset.status,
          }}
          units={[asset.unit]}
          spaces={spaces}
          backHref="/dashboard/admin/assets"
        />
      </div>
    </div>
  );
}

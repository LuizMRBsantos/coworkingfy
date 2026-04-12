import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { AssetCard } from "@/components/shared/AssetCard";
import { Pagination } from "@/components/shared/Pagination";
import { PAGE_SIZE } from "@/lib/constants";
import { Plus } from "lucide-react";
import type { AssetStatus, AssetType } from "@prisma/client";
import { z } from "zod";

interface PageProps {
  searchParams: Promise<{ unitId?: string; type?: string; status?: string; page?: string }>;
}

const TypeSchema   = z.nativeEnum({ AC:"AC",ELECTRONIC:"ELECTRONIC",HYDRAULIC:"HYDRAULIC",CLEANING:"CLEANING",HVAC:"HVAC",FIRE_SAFETY:"FIRE_SAFETY",ELECTRICAL:"ELECTRICAL",PLUMBING:"PLUMBING",ELEVATOR:"ELEVATOR",APPLIANCE:"APPLIANCE",IT_INFRA:"IT_INFRA",FURNITURE:"FURNITURE",OTHER:"OTHER" } as const).optional();
const StatusSchema = z.nativeEnum({ ACTIVE:"ACTIVE",INACTIVE:"INACTIVE",MAINTENANCE:"MAINTENANCE",UNDER_MAINTENANCE:"UNDER_MAINTENANCE",DECOMMISSIONED:"DECOMMISSIONED" } as const).optional();

const ASSET_TYPE_OPTIONS: [AssetType, string][] = [
  ["HVAC","HVAC / Climatização"],["FIRE_SAFETY","Segurança incêndio"],["ELECTRICAL","Elétrica"],
  ["PLUMBING","Hidráulica"],["ELEVATOR","Elevador"],["APPLIANCE","Eletrodoméstico"],
  ["IT_INFRA","TI / Infra"],["FURNITURE","Mobiliário"],["AC","Ar-condicionado (legado)"],
  ["ELECTRONIC","Eletrônico (legado)"],["HYDRAULIC","Hidráulico (legado)"],["OTHER","Outro"],
];

const ASSET_STATUS_OPTIONS: [AssetStatus, string][] = [
  ["ACTIVE","Ativo"],["INACTIVE","Inativo"],["UNDER_MAINTENANCE","Em manutenção"],["DECOMMISSIONED","Baixado"],
];

export default async function AssetsPage({ searchParams }: PageProps) {
  const session = await auth();
  if (!session) redirect("/login");
  if (session.user.role !== "ADMIN") redirect("/dashboard");

  const sp = await searchParams;
  const page   = Math.max(1, parseInt(sp.page ?? "1", 10) || 1);
  const skip   = (page - 1) * PAGE_SIZE;

  const typeParsed   = TypeSchema.safeParse(sp.type ?? undefined);
  const statusParsed = StatusSchema.safeParse(sp.status ?? undefined);

  const where = {
    ...(sp.unitId                                   ? { unitId: sp.unitId }                     : {}),
    ...(typeParsed.success   && typeParsed.data     ? { type:   typeParsed.data   as AssetType }   : {}),
    ...(statusParsed.success && statusParsed.data   ? { status: statusParsed.data as AssetStatus } : {}),
  };

  const [assets, total, units] = await Promise.all([
    db.asset.findMany({
      where,
      orderBy: { code: "asc" },
      skip,
      take: PAGE_SIZE,
      include: {
        unit:   { select: { id: true, name: true } },
        space:  { select: { id: true, name: true } },
        _count: { select: { serviceOrders: true } },
      },
    }),
    db.asset.count({ where }),
    db.unit.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
  ]);

  const totalPages = Math.ceil(total / PAGE_SIZE);
  const spForPage: Record<string, string> = {};
  if (sp.unitId) spForPage.unitId = sp.unitId;
  if (sp.type)   spForPage.type   = sp.type;
  if (sp.status) spForPage.status = sp.status;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Equipamentos e Ativos</h1>
          <p className="text-sm text-gray-500 mt-1">{total} ativo{total !== 1 ? "s" : ""} cadastrado{total !== 1 ? "s" : ""}</p>
        </div>
        <Link href="/dashboard/admin/assets/new">
          <Button size="sm">
            <Plus className="h-4 w-4 mr-1" />
            Novo ativo
          </Button>
        </Link>
      </div>

      {/* Filtros */}
      <form method="GET" className="flex flex-wrap gap-3">
        <select name="unitId" defaultValue={sp.unitId ?? ""} className="text-sm border border-gray-200 rounded-md px-3 py-2 bg-white">
          <option value="">Todas as unidades</option>
          {units.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
        </select>
        <select name="type" defaultValue={sp.type ?? ""} className="text-sm border border-gray-200 rounded-md px-3 py-2 bg-white">
          <option value="">Todas as categorias</option>
          {ASSET_TYPE_OPTIONS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
        <select name="status" defaultValue={sp.status ?? ""} className="text-sm border border-gray-200 rounded-md px-3 py-2 bg-white">
          <option value="">Todos os status</option>
          {ASSET_STATUS_OPTIONS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
        <button type="submit" className="text-sm border border-gray-200 rounded-md px-4 py-2 bg-gray-50 hover:bg-gray-100 transition-colors">
          Filtrar
        </button>
      </form>

      {/* Lista */}
      <div className="grid gap-3">
        {assets.length === 0 ? (
          <div className="text-center py-16 text-gray-400">Nenhum ativo encontrado.</div>
        ) : (
          assets.map((a) => <AssetCard key={a.id} asset={a} />)
        )}
      </div>

      <Pagination page={page} totalPages={totalPages} searchParams={spForPage} />
    </div>
  );
}

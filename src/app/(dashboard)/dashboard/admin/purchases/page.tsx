import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Pagination } from "@/components/shared/Pagination";
import { PURCHASE_CATEGORY_LABEL, PURCHASE_CATEGORY_CLASS } from "@/components/shared/PurchaseForm";
import { PAGE_SIZE } from "@/lib/constants";
import { Plus, ShoppingCart } from "lucide-react";
import type { PurchaseCategory } from "@prisma/client";

interface PageProps {
  searchParams: Promise<{ unitId?: string; category?: string; from?: string; to?: string; page?: string }>;
}

function fmt(v: string) {
  return Number(v).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export default async function PurchasesPage({ searchParams }: PageProps) {
  const session = await auth();
  if (!session) redirect("/login");
  if (session.user.role !== "ADMIN") redirect("/dashboard");

  const sp          = await searchParams;
  const unitFilter  = sp.unitId   ?? undefined;
  const catFilter   = sp.category as PurchaseCategory | undefined;
  const fromFilter  = sp.from     ?? undefined;
  const toFilter    = sp.to       ?? undefined;
  const page        = Math.max(1, parseInt(sp.page ?? "1", 10) || 1);
  const skip        = (page - 1) * PAGE_SIZE;

  const where = {
    ...(unitFilter ? { unitId: unitFilter } : {}),
    ...(catFilter  ? { category: catFilter } : {}),
    ...(fromFilter || toFilter ? {
      purchasedAt: {
        ...(fromFilter ? { gte: new Date(fromFilter) } : {}),
        ...(toFilter   ? { lte: new Date(toFilter)   } : {}),
      },
    } : {}),
  };

  const [purchases, total, units, totals] = await Promise.all([
    db.purchase.findMany({
      where,
      orderBy: { purchasedAt: "desc" },
      skip,
      take: PAGE_SIZE,
      include: {
        unit:      { select: { id: true, name: true } },
        createdBy: { select: { name: true } },
      },
    }),
    db.purchase.count({ where }),
    db.unit.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
    db.purchase.groupBy({
      by:   ["category"],
      where,
      _sum: { value: true },
    }),
  ]);

  const grandTotal = totals.reduce((acc, t) => acc + Number(t._sum.value ?? 0), 0);
  const totalPages = Math.ceil(total / PAGE_SIZE);

  const spObj: Record<string, string> = {};
  if (unitFilter) spObj.unitId   = unitFilter;
  if (catFilter)  spObj.category = catFilter;
  if (fromFilter) spObj.from     = fromFilter;
  if (toFilter)   spObj.to       = toFilter;

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Compras de Insumos</h1>
          <p className="text-sm text-gray-500 mt-0.5">Registro de limpeza, café e material de escritório</p>
        </div>
        <Link href="/dashboard/admin/purchases/new">
          <Button size="sm">
            <Plus className="h-4 w-4 mr-1" />
            Nova compra
          </Button>
        </Link>
      </div>

      {/* Cards de totais por categoria */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="bg-gray-50 border-gray-100">
          <CardContent className="p-4">
            <p className="text-xs text-gray-500 font-medium mb-1 flex items-center gap-1">
              <ShoppingCart className="h-3.5 w-3.5" /> Total geral
            </p>
            <p className="text-xl font-bold text-gray-900">{fmt(grandTotal.toString())}</p>
            <p className="text-xs text-gray-400 mt-0.5">{total} registro{total !== 1 ? "s" : ""}</p>
          </CardContent>
        </Card>
        {totals.map((t) => (
          <Card key={t.category} className="border-gray-100">
            <CardContent className="p-4">
              <Badge className={`text-[10px] mb-2 ${PURCHASE_CATEGORY_CLASS[t.category as PurchaseCategory]}`}>
                {PURCHASE_CATEGORY_LABEL[t.category as PurchaseCategory]}
              </Badge>
              <p className="text-lg font-bold text-gray-900">{fmt((t._sum.value ?? 0).toString())}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filtros */}
      <form method="GET" className="flex flex-wrap gap-3">
        <select name="unitId" defaultValue={unitFilter ?? ""} className="text-sm border rounded-md px-3 py-1.5 bg-white text-gray-700">
          <option value="">Todas as unidades</option>
          {units.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
        </select>

        <select name="category" defaultValue={catFilter ?? ""} className="text-sm border rounded-md px-3 py-1.5 bg-white text-gray-700">
          <option value="">Todas as categorias</option>
          <option value="CLEANING">Limpeza</option>
          <option value="COFFEE">Café</option>
          <option value="OFFICE_SUPPLIES">Material de escritório</option>
        </select>

        <input type="date" name="from" defaultValue={fromFilter ?? ""} className="text-sm border rounded-md px-3 py-1.5 bg-white text-gray-700" />
        <input type="date" name="to"   defaultValue={toFilter ?? ""}   className="text-sm border rounded-md px-3 py-1.5 bg-white text-gray-700" />

        <Button type="submit" variant="outline" size="sm">Filtrar</Button>
        <Link href="/dashboard/admin/purchases">
          <Button type="button" variant="ghost" size="sm">Limpar</Button>
        </Link>
      </form>

      {/* Lista */}
      {purchases.length === 0 ? (
        <p className="text-sm text-gray-400 py-8 text-center">Nenhuma compra encontrada.</p>
      ) : (
        <div className="space-y-2">
          {purchases.map((p) => (
            <Link key={p.id} href={`/dashboard/admin/purchases/${p.id}`} className="block">
              <Card className="hover:border-gray-300 transition-colors border-gray-100">
                <CardContent className="p-4 flex items-center gap-4">
                  <Badge className={`shrink-0 rounded-full text-xs ${PURCHASE_CATEGORY_CLASS[p.category]}`}>
                    {PURCHASE_CATEGORY_LABEL[p.category]}
                  </Badge>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{p.description}</p>
                    <p className="text-xs text-gray-400">{p.unit.name}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-bold text-gray-900">{fmt(p.value.toString())}</p>
                    <p className="text-xs text-gray-400">
                      {new Date(p.purchasedAt).toLocaleDateString("pt-BR")}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}

      <Pagination page={page} totalPages={totalPages} searchParams={spObj} />
    </div>
  );
}

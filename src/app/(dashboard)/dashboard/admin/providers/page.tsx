import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { ProviderCard } from "@/components/shared/ProviderCard";
import { Pagination } from "@/components/shared/Pagination";
import { PAGE_SIZE } from "@/lib/constants";
import { Plus } from "lucide-react";
import type { ProviderType, ServiceType } from "@prisma/client";

interface PageProps {
  searchParams: Promise<{ type?: string; specialty?: string; unitId?: string; page?: string }>;
}

export default async function AdminProvidersPage({ searchParams }: PageProps) {
  const session = await auth();
  if (!session) redirect("/login");
  if (session.user.role !== "ADMIN") redirect("/dashboard");

  const { type, specialty, unitId, page: pageParam } = await searchParams;

  const page = Math.max(1, parseInt(pageParam ?? "1", 10) || 1);
  const skip = (page - 1) * PAGE_SIZE;

  const where = {
    ...(unitId    ? { unitId }                                : {}),
    ...(type      ? { type:      type      as ProviderType }  : {}),
    ...(specialty ? { specialty: specialty as ServiceType }   : {}),
  };

  const [providers, total, units] = await Promise.all([
    db.provider.findMany({
      where,
      orderBy: [{ name: "asc" }],
      skip,
      take: PAGE_SIZE,
      include: {
        unit:   { select: { id: true, name: true } },
        _count: { select: { serviceOrders: true } },
      },
    }),
    db.provider.count({ where }),
    db.unit.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
  ]);

  const totalPages = Math.ceil(total / PAGE_SIZE);
  const sp: Record<string, string> = {};
  if (type)      sp.type      = type;
  if (specialty) sp.specialty = specialty;
  if (unitId)    sp.unitId    = unitId;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Prestadores</h1>
          <p className="text-sm text-gray-500 mt-1">
            {total} prestador{total !== 1 ? "es" : ""} cadastrado{total !== 1 ? "s" : ""}
          </p>
        </div>
        <Link href="/dashboard/admin/providers/new">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Novo Prestador
          </Button>
        </Link>
      </div>

      {/* Filtros */}
      <div className="flex gap-2 flex-wrap text-sm">
        <Link
          href="/dashboard/admin/providers"
          className={`px-3 py-1 rounded-full border transition-colors ${!type && !specialty && !unitId ? "bg-gray-900 text-white border-gray-900" : "border-gray-200 text-gray-600 hover:bg-gray-50"}`}
        >
          Todos
        </Link>
        {(["RECURRING", "PUNCTUAL"] as ProviderType[]).map((t) => (
          <Link
            key={t}
            href={`/dashboard/admin/providers?type=${t}`}
            className={`px-3 py-1 rounded-full border transition-colors ${type === t ? "bg-gray-900 text-white border-gray-900" : "border-gray-200 text-gray-600 hover:bg-gray-50"}`}
          >
            {t === "RECURRING" ? "Recorrentes" : "Pontuais"}
          </Link>
        ))}
        <span className="border-l border-gray-200 mx-1" />
        {units.map((u) => (
          <Link
            key={u.id}
            href={`/dashboard/admin/providers?unitId=${u.id}${type ? `&type=${type}` : ""}`}
            className={`px-3 py-1 rounded-full border transition-colors ${unitId === u.id ? "bg-gray-900 text-white border-gray-900" : "border-gray-200 text-gray-600 hover:bg-gray-50"}`}
          >
            {u.name}
          </Link>
        ))}
      </div>

      <div className="grid gap-3">
        {providers.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            Nenhum prestador encontrado para os filtros selecionados.
          </div>
        ) : (
          providers.map((provider) => (
            <ProviderCard
              key={provider.id}
              provider={provider}
              href={`/dashboard/admin/providers/${provider.id}`}
            />
          ))
        )}
      </div>

      <Pagination page={page} totalPages={totalPages} searchParams={sp} />
    </div>
  );
}

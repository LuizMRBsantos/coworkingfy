import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { ProviderCard } from "@/components/shared/ProviderCard";
import { Plus } from "lucide-react";
import type { ProviderType } from "@prisma/client";

interface PageProps {
  searchParams: Promise<{ type?: string }>;
}

export default async function ReceptionProvidersPage({ searchParams }: PageProps) {
  const session = await auth();
  if (!session) redirect("/login");
  if (session.user.role === "MEMBER") redirect("/dashboard");

  const { unitIds } = session.user;
  const { type } = await searchParams;

  const providers = await db.provider.findMany({
    where: {
      unitId: { in: unitIds },
      ...(type ? { type: type as ProviderType } : {}),
    },
    orderBy: [{ name: "asc" }],
    include: {
      unit:   { select: { id: true, name: true } },
      _count: { select: { serviceOrders: true } },
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Prestadores</h1>
          <p className="text-sm text-gray-500 mt-1">
            {providers.length} prestador{providers.length !== 1 ? "es" : ""} da{providers.length !== 1 ? "s" : ""} sua{providers.length !== 1 ? "s" : ""} unidade{providers.length !== 1 ? "s" : ""}
          </p>
        </div>
        <Link href="/dashboard/reception/providers/new">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Novo Prestador
          </Button>
        </Link>
      </div>

      {/* Filtros de tipo */}
      <div className="flex gap-2 flex-wrap text-sm">
        <Link
          href="/dashboard/reception/providers"
          className={`px-3 py-1 rounded-full border transition-colors ${!type ? "bg-gray-900 text-white border-gray-900" : "border-gray-200 text-gray-600 hover:bg-gray-50"}`}
        >
          Todos
        </Link>
        {(["RECURRING", "PUNCTUAL"] as ProviderType[]).map((t) => (
          <Link
            key={t}
            href={`/dashboard/reception/providers?type=${t}`}
            className={`px-3 py-1 rounded-full border transition-colors ${type === t ? "bg-gray-900 text-white border-gray-900" : "border-gray-200 text-gray-600 hover:bg-gray-50"}`}
          >
            {t === "RECURRING" ? "Recorrentes" : "Pontuais"}
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
              href={`/dashboard/reception/providers/${provider.id}`}
            />
          ))
        )}
      </div>
    </div>
  );
}

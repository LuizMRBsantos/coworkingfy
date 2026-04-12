import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { SpaceCard } from "@/components/shared/SpaceCard";
import { Pagination } from "@/components/shared/Pagination";
import { PAGE_SIZE } from "@/lib/constants";
import { Plus } from "lucide-react";
import type { SpaceType, SpaceStatus } from "@prisma/client";

interface PageProps {
  searchParams: Promise<{ type?: string; status?: string; page?: string }>;
}

export default async function SpacesPage({ searchParams }: PageProps) {
  const session = await auth();
  if (!session) redirect("/login");
  if (session.user.role !== "ADMIN") redirect("/dashboard");

  const { type, status, page: pageParam } = await searchParams;

  const page = Math.max(1, parseInt(pageParam ?? "1", 10) || 1);
  const skip = (page - 1) * PAGE_SIZE;

  const where = {
    ...(type   ? { type:   type   as SpaceType }   : {}),
    ...(status ? { status: status as SpaceStatus } : {}),
  };

  const [spaces, total, coworkingUnit] = await Promise.all([
    db.space.findMany({
      where,
      orderBy: [{ type: "asc" }, { name: "asc" }],
      skip,
      take: PAGE_SIZE,
      include: {
        unit:   { select: { id: true, name: true } },
        _count: { select: { bookings: true, serviceOrders: true } },
      },
    }),
    db.space.count({ where }),
    db.unit.findFirst({ where: { type: "COWORKING" }, select: { id: true, name: true } }),
  ]);

  const totalPages = Math.ceil(total / PAGE_SIZE);
  const sp: Record<string, string> = {};
  if (type)   sp.type   = type;
  if (status) sp.status = status;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Espaços</h1>
          <p className="text-sm text-gray-500 mt-1">
            {total} espaço{total !== 1 ? "s" : ""} cadastrado{total !== 1 ? "s" : ""}
            {coworkingUnit && <span className="ml-1">— {coworkingUnit.name}</span>}
          </p>
        </div>
        <Link href="/dashboard/admin/spaces/new">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Novo Espaço
          </Button>
        </Link>
      </div>

      {/* Filtros */}
      <div className="flex gap-2 flex-wrap text-sm">
        <Link
          href="/dashboard/admin/spaces"
          className={`px-3 py-1 rounded-full border transition-colors ${!type && !status ? "bg-gray-900 text-white border-gray-900" : "border-gray-200 text-gray-600 hover:bg-gray-50"}`}
        >
          Todos
        </Link>
        {(["MEETING_ROOM", "PRIVATE_OFFICE", "WORKSTATION"] as SpaceType[]).map((t) => (
          <Link
            key={t}
            href={`/dashboard/admin/spaces?type=${t}${status ? `&status=${status}` : ""}`}
            className={`px-3 py-1 rounded-full border transition-colors ${type === t ? "bg-gray-900 text-white border-gray-900" : "border-gray-200 text-gray-600 hover:bg-gray-50"}`}
          >
            {{ MEETING_ROOM: "Reunião", PRIVATE_OFFICE: "Privativas", WORKSTATION: "Estações" }[t]}
          </Link>
        ))}
        <span className="border-l border-gray-200 mx-1" />
        {(["ACTIVE", "MAINTENANCE", "INACTIVE"] as SpaceStatus[]).map((s) => (
          <Link
            key={s}
            href={`/dashboard/admin/spaces?status=${s}${type ? `&type=${type}` : ""}`}
            className={`px-3 py-1 rounded-full border transition-colors ${status === s ? "bg-gray-900 text-white border-gray-900" : "border-gray-200 text-gray-600 hover:bg-gray-50"}`}
          >
            {{ ACTIVE: "Ativos", MAINTENANCE: "Manutenção", INACTIVE: "Inativos" }[s]}
          </Link>
        ))}
      </div>

      <div className="grid gap-3">
        {spaces.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            Nenhum espaço encontrado para os filtros selecionados.
          </div>
        ) : (
          spaces.map((space) => (
            <SpaceCard
              key={space.id}
              space={space}
              href={`/dashboard/admin/spaces/${space.id}`}
            />
          ))
        )}
      </div>

      <Pagination page={page} totalPages={totalPages} searchParams={sp} />
    </div>
  );
}

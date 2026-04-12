import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { TicketCard } from "@/components/shared/TicketCard";
import { TicketFilters } from "@/components/shared/TicketFilters";
import { Pagination } from "@/components/shared/Pagination";
import { PAGE_SIZE } from "@/lib/constants";
import { Plus } from "lucide-react";
import type { TicketStatus } from "@prisma/client";

interface PageProps {
  searchParams: Promise<{ status?: string; unitId?: string; page?: string }>;
}

export default async function TicketsPage({ searchParams }: PageProps) {
  const session = await auth();
  if (!session) redirect("/login");

  const { status, unitId, page: pageParam } = await searchParams;

  const role    = session.user.role;
  if (role === "MEMBER") redirect("/dashboard");

  const unitFilter = role === "ADMIN" ? unitId : undefined;
  const unitIds    = session.user.unitIds;
  const page       = Math.max(1, parseInt(pageParam ?? "1", 10) || 1);
  const skip       = (page - 1) * PAGE_SIZE;

  const where = {
    ...(unitFilter ? { unitId: unitFilter } : role === "RECEPTIONIST" ? { unitId: { in: unitIds } } : {}),
    ...(status ? { status: status as TicketStatus } : {}),
  };

  const [tickets, total, units] = await Promise.all([
    db.ticket.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: PAGE_SIZE,
      include: {
        unit:      { select: { id: true, name: true } },
        createdBy: { select: { id: true, name: true } },
        _count:    { select: { serviceOrders: true } },
      },
    }),
    db.ticket.count({ where }),
    db.unit.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
  ]);

  const totalPages = Math.ceil(total / PAGE_SIZE);
  const sp: Record<string, string> = {};
  if (status) sp.status = status;
  if (unitId) sp.unitId = unitId;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Tickets / SLA</h1>
          <p className="text-sm text-gray-500 mt-1">
            {total} ticket{total !== 1 ? "s" : ""} encontrado{total !== 1 ? "s" : ""}
          </p>
        </div>
        {role === "ADMIN" && (
          <Link href="/dashboard/admin/tickets/new">
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Novo Ticket
            </Button>
          </Link>
        )}
      </div>

      <TicketFilters
        units={units}
        currentStatus={status}
        currentUnitId={role === "ADMIN" ? unitFilter : unitIds[0]}
        showUnitFilter={role === "ADMIN"}
      />

      <div className="grid gap-4">
        {tickets.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            Nenhum ticket encontrado para os filtros selecionados.
          </div>
        ) : (
          tickets.map((ticket) => <TicketCard key={ticket.id} ticket={ticket} />)
        )}
      </div>

      <Pagination page={page} totalPages={totalPages} searchParams={sp} />
    </div>
  );
}

import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { TicketCard } from "@/components/shared/TicketCard";
import { TicketFilters } from "@/components/shared/TicketFilters";
import { Plus } from "lucide-react";
import type { TicketStatus } from "@prisma/client";

interface PageProps {
  searchParams: Promise<{ status?: string; unitId?: string }>;
}

export default async function TicketsPage({ searchParams }: PageProps) {
  const session = await auth();
  if (!session) redirect("/login");

  const { status, unitId } = await searchParams;

  const role = session.user.role;
  if (role === "MEMBER") redirect("/dashboard");

  // RECEPTIONIST sempre vê só sua unidade — ignora ?unitId= da URL
  const unitFilter = role === "ADMIN" ? unitId : (session.user.unitId ?? undefined);

  const [tickets, units] = await Promise.all([
    db.ticket.findMany({
      where: {
        ...(unitFilter ? { unitId: unitFilter } : {}),
        ...(status ? { status: status as TicketStatus } : {}),
      },
      orderBy: { createdAt: "desc" },
      include: {
        unit:      { select: { id: true, name: true } },
        createdBy: { select: { id: true, name: true } },
        _count:    { select: { serviceOrders: true } },
      },
    }),
    db.unit.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Tickets / SLA</h1>
          <p className="text-sm text-gray-500 mt-1">
            {tickets.length} ticket{tickets.length !== 1 ? "s" : ""} encontrado{tickets.length !== 1 ? "s" : ""}
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
        currentUnitId={unitFilter}
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
    </div>
  );
}

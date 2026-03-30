import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { TicketServiceOrderForm } from "@/components/shared/TicketServiceOrderForm";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function NewServiceOrderPage({ params }: PageProps) {
  const session = await auth();
  if (!session) redirect("/login");

  const { role, unitIds } = session.user;
  if (role === "MEMBER") redirect("/dashboard");

  const { id: ticketId } = await params;

  const ticket = await db.ticket.findUnique({
    where: { id: ticketId },
    include: { unit: { select: { id: true, name: true, type: true } } },
  });

  if (!ticket) notFound();

  // RECEPTIONIST só acessa tickets das suas unidades
  if (role === "RECEPTIONIST" && !unitIds.includes(ticket.unitId)) {
    redirect("/dashboard/admin/tickets");
  }

  const isCoworking = ticket.unit.type === "COWORKING";

  const [providers, spaces] = await Promise.all([
    db.provider.findMany({
      where: { unitId: ticket.unitId, status: "ACTIVE" },
      select: { id: true, name: true, specialty: true },
      orderBy: { name: "asc" },
    }),
    isCoworking
      ? db.space.findMany({
          where: { unitId: ticket.unitId, status: "ACTIVE" },
          select: { id: true, name: true, type: true },
          orderBy: { name: "asc" },
        })
      : Promise.resolve([]),
  ]);

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Nova Ordem de Serviço</h1>
        <p className="text-sm text-gray-500 mt-1">
          Criando OS para{" "}
          <span className="font-medium text-gray-700">{ticket.number}</span>
          {" — "}{ticket.unit.name}
        </p>
      </div>
      <TicketServiceOrderForm
        ticketId={ticket.id}
        ticketNumber={ticket.number}
        unitId={ticket.unitId}
        providers={providers}
        spaces={spaces}
        isCoworking={isCoworking}
      />
    </div>
  );
}

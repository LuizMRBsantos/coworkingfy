import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { TicketForm } from "@/components/shared/TicketForm";

export default async function NewTicketPage() {
  const session = await auth();
  if (!session) redirect("/login");
  if (session.user.role !== "ADMIN") redirect("/dashboard");

  const units = await db.unit.findMany({
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Novo Ticket</h1>
        <p className="text-sm text-gray-500 mt-1">Registre um chamado recebido do cliente</p>
      </div>
      <TicketForm units={units} />
    </div>
  );
}

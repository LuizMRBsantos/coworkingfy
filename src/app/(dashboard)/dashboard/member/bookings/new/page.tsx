import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { BookingForm } from "@/components/shared/BookingForm";

export default async function NewBookingPage() {
  const session = await auth();
  if (!session) redirect("/login");

  // Apenas espaços ATIVOS do coworking
  const spaces = await db.space.findMany({
    where: {
      status: "ACTIVE",
      unit:   { type: "COWORKING" },
    },
    select:  { id: true, name: true, type: true, capacity: true },
    orderBy: [{ type: "asc" }, { name: "asc" }],
  });

  return (
    <div className="space-y-6 max-w-lg">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Nova Reserva</h1>
        <p className="text-sm text-gray-500 mt-1">
          Reserve um espaço no coworking. Horário de funcionamento: 7h–22h.
        </p>
      </div>

      <BookingForm spaces={spaces} backHref="/dashboard/member/bookings" />
    </div>
  );
}

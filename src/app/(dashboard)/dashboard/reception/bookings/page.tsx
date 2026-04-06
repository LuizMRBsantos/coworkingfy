import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { BookingCard } from "@/components/shared/BookingCard";
import { BookingActions } from "@/components/shared/BookingActions";
import { CancelBookingButton } from "@/components/shared/CancelBookingButton";
import type { BookingStatus } from "@prisma/client";

interface PageProps {
  searchParams: Promise<{ status?: string }>;
}

export default async function ReceptionBookingsPage({ searchParams }: PageProps) {
  const session = await auth();
  if (!session) redirect("/login");
  if (session.user.role === "MEMBER") redirect("/dashboard");

  const { unitIds } = session.user;
  const { status }  = await searchParams;

  const bookings = await db.booking.findMany({
    where: {
      space: { unitId: { in: unitIds } },
      ...(status ? { status: status as BookingStatus } : {}),
    },
    orderBy: [{ status: "asc" }, { startTime: "asc" }],
    include: {
      space: {
        select: {
          id: true, name: true, type: true,
          unit: { select: { id: true, name: true } },
        },
      },
      user:       { select: { id: true, name: true, email: true } },
      approvedBy: { select: { id: true, name: true } },
    },
  });

  const pending   = bookings.filter((b) => b.status === "PENDING_APPROVAL");
  const confirmed = bookings.filter((b) => b.status === "CONFIRMED");
  const others    = bookings.filter((b) => b.status !== "PENDING_APPROVAL" && b.status !== "CONFIRMED");

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Reservas</h1>
        <p className="text-sm text-gray-500 mt-1">
          {pending.length > 0
            ? `${pending.length} reserva${pending.length !== 1 ? "s" : ""} aguardando aprovação`
            : "Nenhuma reserva pendente"}
        </p>
      </div>

      {/* Pendentes — destaque */}
      {pending.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-yellow-700 uppercase tracking-wide flex items-center gap-2">
            <span className="inline-block h-2 w-2 rounded-full bg-yellow-400" />
            Aguardando aprovação ({pending.length})
          </h2>
          {pending.map((b) => (
            <BookingCard
              key={b.id}
              booking={b}
              showUser
              actions={<BookingActions bookingId={b.id} />}
            />
          ))}
        </div>
      )}

      {/* Confirmadas */}
      {confirmed.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
            Confirmadas ({confirmed.length})
          </h2>
          {confirmed.map((b) => (
            <BookingCard
              key={b.id}
              booking={b}
              showUser
              actions={<CancelBookingButton bookingId={b.id} />}
            />
          ))}
        </div>
      )}

      {/* Histórico */}
      {others.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Histórico</h2>
          {others.map((b) => (
            <BookingCard key={b.id} booking={b} showUser />
          ))}
        </div>
      )}

      {bookings.length === 0 && (
        <div className="text-center py-16 text-gray-400">Nenhuma reserva encontrada.</div>
      )}
    </div>
  );
}

import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { BookingCard } from "@/components/shared/BookingCard";
import { CancelBookingButton } from "@/components/shared/CancelBookingButton";
import { Plus } from "lucide-react";

const CANCEL_HOURS_BEFORE = Number(process.env.CANCEL_HOURS_BEFORE ?? 2);

export default async function MemberBookingsPage() {
  const session = await auth();
  if (!session) redirect("/login");

  const userId = session.user.id;

  const bookings = await db.booking.findMany({
    where:   { userId },
    orderBy: { startTime: "desc" },
    include: {
      space: {
        select: {
          id: true, name: true, type: true,
          unit: { select: { id: true, name: true } },
        },
      },
      user: { select: { id: true, name: true, email: true } },
    },
  });

  const now      = new Date();
  const pending  = bookings.filter((b) => b.status === "PENDING_APPROVAL");
  const upcoming = bookings.filter((b) => b.status === "CONFIRMED" && new Date(b.startTime) >= now);
  const past     = bookings.filter((b) =>
    (b.status === "CONFIRMED" && new Date(b.startTime) < now) ||
    b.status === "CANCELLED" ||
    b.status === "REJECTED"
  );

  function canCancel(startTime: Date) {
    const limitTime = new Date(new Date(startTime).getTime() - CANCEL_HOURS_BEFORE * 60 * 60 * 1000);
    return now < limitTime;
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Minhas Reservas</h1>
          <p className="text-sm text-gray-500 mt-1">{upcoming.length} reserva{upcoming.length !== 1 ? "s" : ""} próxima{upcoming.length !== 1 ? "s" : ""}</p>
        </div>
        <Link href="/dashboard/member/bookings/new">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Nova Reserva
          </Button>
        </Link>
      </div>

      {/* Pendentes de aprovação */}
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
              actions={<CancelBookingButton bookingId={b.id} />}
            />
          ))}
        </div>
      )}

      {/* Próximas confirmadas */}
      <div className="space-y-3">
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Próximas confirmadas</h2>
        {upcoming.length === 0 ? (
          <div className="text-center py-10 text-gray-400 border border-dashed rounded-lg">
            Nenhuma reserva confirmada. <Link href="/dashboard/member/bookings/new" className="text-yellow-600 underline">Faça uma reserva</Link>.
          </div>
        ) : (
          upcoming.map((b) => (
            <BookingCard
              key={b.id}
              booking={b}
              actions={canCancel(b.startTime) ? <CancelBookingButton bookingId={b.id} /> : undefined}
            />
          ))
        )}
      </div>

      {/* Histórico */}
      {past.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Histórico</h2>
          {past.map((b) => (
            <BookingCard key={b.id} booking={b} />
          ))}
        </div>
      )}
    </div>
  );
}

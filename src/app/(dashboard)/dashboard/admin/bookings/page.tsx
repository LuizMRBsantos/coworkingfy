import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { BookingCard } from "@/components/shared/BookingCard";
import { BookingActions } from "@/components/shared/BookingActions";
import { CancelBookingButton } from "@/components/shared/CancelBookingButton";
import type { BookingStatus } from "@prisma/client";

const CANCEL_HOURS_BEFORE = Number(process.env.CANCEL_HOURS_BEFORE ?? 2);

interface PageProps {
  searchParams: Promise<{ status?: string; unitId?: string; date?: string }>;
}

export default async function AdminBookingsPage({ searchParams }: PageProps) {
  const session = await auth();
  if (!session) redirect("/login");
  if (session.user.role !== "ADMIN") redirect("/dashboard");

  const { status, unitId, date } = await searchParams;

  const dateFilter = date ? new Date(date) : undefined;
  const nextDay    = dateFilter ? new Date(new Date(date!).getTime() + 86400000) : undefined;

  const [bookings, units] = await Promise.all([
    db.booking.findMany({
      where: {
        ...(status  ? { status:    status as BookingStatus }   : {}),
        ...(unitId  ? { space: { unitId } }                     : {}),
        ...(dateFilter && nextDay
          ? { startTime: { gte: dateFilter, lt: nextDay } }
          : {}),
      },
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
    }),
    db.unit.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
  ]);

  const now = new Date();

  function canCancel(startTime: Date, bookingStatus: BookingStatus) {
    if (bookingStatus !== "CONFIRMED") return false;
    const limitTime = new Date(new Date(startTime).getTime() - CANCEL_HOURS_BEFORE * 60 * 60 * 1000);
    return now < limitTime;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Reservas</h1>
        <p className="text-sm text-gray-500 mt-1">
          {bookings.length} reserva{bookings.length !== 1 ? "s" : ""} encontrada{bookings.length !== 1 ? "s" : ""}
        </p>
      </div>

      {/* Filtros */}
      <div className="flex gap-2 flex-wrap text-sm items-center">
        <Link
          href="/dashboard/admin/bookings"
          className={`px-3 py-1 rounded-full border transition-colors ${!status && !unitId && !date ? "bg-gray-900 text-white border-gray-900" : "border-gray-200 text-gray-600 hover:bg-gray-50"}`}
        >
          Todas
        </Link>
        {(["PENDING_APPROVAL", "CONFIRMED", "CANCELLED", "REJECTED"] as BookingStatus[]).map((s) => (
          <Link
            key={s}
            href={`/dashboard/admin/bookings?status=${s}${unitId ? `&unitId=${unitId}` : ""}`}
            className={`px-3 py-1 rounded-full border transition-colors ${status === s ? "bg-gray-900 text-white border-gray-900" : "border-gray-200 text-gray-600 hover:bg-gray-50"}`}
          >
            {{ PENDING_APPROVAL: "Pendentes", CONFIRMED: "Confirmadas", CANCELLED: "Canceladas", REJECTED: "Rejeitadas" }[s]}
          </Link>
        ))}
        <span className="border-l border-gray-200 mx-1" />
        {units.map((u) => (
          <Link
            key={u.id}
            href={`/dashboard/admin/bookings?unitId=${u.id}${status ? `&status=${status}` : ""}`}
            className={`px-3 py-1 rounded-full border transition-colors ${unitId === u.id ? "bg-gray-900 text-white border-gray-900" : "border-gray-200 text-gray-600 hover:bg-gray-50"}`}
          >
            {u.name}
          </Link>
        ))}
      </div>

      <div className="grid gap-3">
        {bookings.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            Nenhuma reserva encontrada para os filtros selecionados.
          </div>
        ) : (
          bookings.map((b) => (
            <BookingCard
              key={b.id}
              booking={b}
              showUser
              actions={
                b.status === "PENDING_APPROVAL"
                  ? <BookingActions bookingId={b.id} />
                  : canCancel(b.startTime, b.status) ? <CancelBookingButton bookingId={b.id} /> : undefined
              }
            />
          ))
        )}
      </div>
    </div>
  );
}

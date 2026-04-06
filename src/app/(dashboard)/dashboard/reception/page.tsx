import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, ClipboardList, FileText, Clock } from "lucide-react";

export default async function ReceptionDashboardPage() {
  const session = await auth();
  if (!session) redirect("/login");
  if (session.user.role === "MEMBER") redirect("/dashboard");

  const { unitIds, role } = session.user;
  const unitFilter = role === "ADMIN" ? {} : { unitId: { in: unitIds } };
  const spaceUnitFilter = role === "ADMIN" ? {} : { space: { unitId: { in: unitIds } } };

  const now = new Date();
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date(now);
  todayEnd.setHours(23, 59, 59, 999);

  const [
    bookingsPending,
    bookingsToday,
    ticketsOpen,
    serviceOrdersActive,
    recentPendingBookings,
    todayBookings,
  ] = await Promise.all([
    db.booking.count({ where: { status: "PENDING_APPROVAL", ...spaceUnitFilter } }),
    db.booking.count({
      where: {
        status: "CONFIRMED",
        startTime: { gte: todayStart, lte: todayEnd },
        ...spaceUnitFilter,
      },
    }),
    db.ticket.count({ where: { status: { in: ["OPEN", "IN_PROGRESS"] }, ...unitFilter } }),
    db.serviceOrder.count({
      where: { status: { in: ["PENDING_APPROVAL", "APPROVED", "IN_PROGRESS"] }, ...unitFilter },
    }),
    db.booking.findMany({
      where: { status: "PENDING_APPROVAL", ...spaceUnitFilter },
      orderBy: { createdAt: "asc" },
      take: 5,
      include: {
        space: { select: { name: true, unit: { select: { name: true } } } },
        user: { select: { name: true, email: true } },
      },
    }),
    db.booking.findMany({
      where: {
        status: "CONFIRMED",
        startTime: { gte: todayStart, lte: todayEnd },
        ...spaceUnitFilter,
      },
      orderBy: { startTime: "asc" },
      take: 8,
      include: {
        space: { select: { name: true, unit: { select: { name: true } } } },
        user: { select: { name: true, email: true } },
      },
    }),
  ]);

  function formatTime(date: Date) {
    return new Date(date).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  }
  function formatDateTime(date: Date) {
    return new Date(date).toLocaleString("pt-BR", {
      day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit",
    });
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Painel</h1>
        <p className="text-sm text-gray-500 mt-1">
          {new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long" })}
        </p>
      </div>

      {/* Cards de resumo */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Link href="/dashboard/reception/bookings" className="block">
          <Card className="hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs text-gray-500 font-medium">Reservas pendentes</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">{bookingsPending}</p>
                </div>
                <Calendar className="h-5 w-5 text-yellow-400 mt-0.5" />
              </div>
              {bookingsPending > 0 && (
                <p className="text-xs text-yellow-600 mt-2">Aguardando aprovação</p>
              )}
            </CardContent>
          </Card>
        </Link>

        <Link href="/dashboard/reception/bookings" className="block">
          <Card className="hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs text-gray-500 font-medium">Reservas hoje</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">{bookingsToday}</p>
                </div>
                <Clock className="h-5 w-5 text-gray-400 mt-0.5" />
              </div>
              <p className="text-xs text-gray-400 mt-2">confirmadas</p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/dashboard/admin/tickets" className="block">
          <Card className="hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs text-gray-500 font-medium">Tickets abertos</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">{ticketsOpen}</p>
                </div>
                <FileText className="h-5 w-5 text-gray-400 mt-0.5" />
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/dashboard/admin/service-orders" className="block">
          <Card className="hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs text-gray-500 font-medium">OS ativas</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">{serviceOrdersActive}</p>
                </div>
                <ClipboardList className="h-5 w-5 text-gray-400 mt-0.5" />
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Fila de aprovação */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold text-gray-700">
                Fila de aprovação
                {bookingsPending > 0 && (
                  <span className="ml-2 inline-flex items-center justify-center h-5 w-5 rounded-full bg-yellow-400 text-white text-[10px] font-bold">
                    {bookingsPending}
                  </span>
                )}
              </CardTitle>
              <Link href="/dashboard/reception/bookings" className="text-xs text-yellow-700 hover:underline">
                Ver todas
              </Link>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            {recentPendingBookings.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-6">Nenhuma reserva aguardando aprovação.</p>
            ) : (
              <div className="space-y-2">
                {recentPendingBookings.map((b) => (
                  <Link
                    key={b.id}
                    href="/dashboard/reception/bookings"
                    className="flex items-start justify-between gap-2 p-2 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-800">{b.space.name}</p>
                      <p className="text-xs text-gray-500">{b.user.name ?? b.user.email}</p>
                      <p className="text-xs text-gray-400">{b.space.unit.name}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-xs text-gray-600">{formatDateTime(b.startTime)}</p>
                      <Badge className="text-[10px] bg-yellow-100 text-yellow-800 mt-1">Pendente</Badge>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Agenda de hoje */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold text-gray-700">Agenda de hoje</CardTitle>
              <Link href="/dashboard/reception/bookings" className="text-xs text-yellow-700 hover:underline">
                Ver todas
              </Link>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            {todayBookings.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-6">Nenhuma reserva confirmada para hoje.</p>
            ) : (
              <div className="space-y-2">
                {todayBookings.map((b) => {
                  const isPast = new Date(b.endTime) < now;
                  return (
                    <div
                      key={b.id}
                      className={`flex items-center justify-between gap-2 p-2 rounded-lg ${isPast ? "opacity-50" : ""}`}
                    >
                      <div className="min-w-0">
                        <p className={`text-sm font-medium ${isPast ? "text-gray-400" : "text-gray-800"}`}>
                          {b.space.name}
                        </p>
                        <p className="text-xs text-gray-400">{b.user.name ?? b.user.email}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-xs text-gray-600 font-medium">
                          {formatTime(b.startTime)} – {formatTime(b.endTime)}
                        </p>
                        {isPast ? (
                          <span className="text-[10px] text-gray-400">Concluída</span>
                        ) : (
                          <Badge className="text-[10px] bg-green-100 text-green-700">Confirmada</Badge>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

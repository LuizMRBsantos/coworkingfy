import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, FileText, Plus, Clock } from "lucide-react";

export default async function MemberDashboardPage() {
  const session = await auth();
  if (!session) redirect("/login");

  const userId = session.user.id;
  const now = new Date();

  const [upcomingBookings, pendingBookings, openTickets] = await Promise.all([
    db.booking.findMany({
      where: {
        userId,
        status: "CONFIRMED",
        startTime: { gte: now },
      },
      orderBy: { startTime: "asc" },
      take: 5,
      include: {
        space: {
          select: {
            name: true,
            type: true,
            unit: { select: { name: true } },
          },
        },
      },
    }),
    db.booking.count({ where: { userId, status: "PENDING_APPROVAL" } }),
    db.ticket.count({ where: { createdById: userId, status: { in: ["OPEN", "IN_PROGRESS"] } } }),
  ]);

  const TYPE_LABEL: Record<string, string> = {
    MEETING_ROOM: "Sala de Reunião",
    PRIVATE_OFFICE: "Sala Privativa",
    WORKSTATION: "Estação de Trabalho",
  };

  function formatDate(date: Date) {
    return new Date(date).toLocaleDateString("pt-BR", {
      weekday: "short", day: "2-digit", month: "short",
    });
  }
  function formatTime(date: Date) {
    return new Date(date).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  }

  const greetingHour = now.getHours();
  const greeting =
    greetingHour < 12 ? "Bom dia" : greetingHour < 18 ? "Boa tarde" : "Boa noite";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">
            {greeting}, {session.user.name?.split(" ")[0] ?? ""}
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            {new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long" })}
          </p>
        </div>
        <Link href="/dashboard/member/bookings/new">
          <Button size="sm">
            <Plus className="h-4 w-4 mr-1.5" />
            Nova reserva
          </Button>
        </Link>
      </div>

      {/* Cards de resumo */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Link href="/dashboard/member/bookings" className="block">
          <Card className="hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs text-gray-500 font-medium">Próximas reservas</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">{upcomingBookings.length}</p>
                </div>
                <Calendar className="h-5 w-5 text-gray-400 mt-0.5" />
              </div>
              <p className="text-xs text-gray-400 mt-2">confirmadas</p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/dashboard/member/bookings" className="block">
          <Card className="hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs text-gray-500 font-medium">Aguardando aprovação</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">{pendingBookings}</p>
                </div>
                <Clock className="h-5 w-5 text-yellow-400 mt-0.5" />
              </div>
              {pendingBookings > 0 && (
                <p className="text-xs text-yellow-600 mt-2">Em análise pela recepção</p>
              )}
            </CardContent>
          </Card>
        </Link>

        <Link href="/dashboard/admin/tickets" className="block">
          <Card className="hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs text-gray-500 font-medium">Tickets abertos</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">{openTickets}</p>
                </div>
                <FileText className="h-5 w-5 text-gray-400 mt-0.5" />
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Próximas reservas */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold text-gray-700">Próximas reservas</CardTitle>
            <Link href="/dashboard/member/bookings" className="text-xs text-yellow-700 hover:underline">
              Ver todas
            </Link>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          {upcomingBookings.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-sm text-gray-400">Você não tem reservas confirmadas.</p>
              <Link href="/dashboard/member/bookings/new">
                <Button variant="outline" size="sm" className="mt-3">
                  <Plus className="h-4 w-4 mr-1.5" />
                  Fazer uma reserva
                </Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-2">
              {upcomingBookings.map((b) => {
                const isToday =
                  new Date(b.startTime).toDateString() === now.toDateString();
                return (
                  <div
                    key={b.id}
                    className="flex items-center justify-between gap-3 p-3 rounded-lg bg-gray-50"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-gray-800">{b.space.name}</p>
                        <Badge variant="outline" className="text-[10px]">
                          {TYPE_LABEL[b.space.type]}
                        </Badge>
                      </div>
                      <p className="text-xs text-gray-400 mt-0.5">{b.space.unit.name}</p>
                    </div>
                    <div className="text-right shrink-0">
                      {isToday ? (
                        <Badge className="text-[10px] bg-green-100 text-green-700">Hoje</Badge>
                      ) : (
                        <p className="text-xs text-gray-600">{formatDate(b.startTime)}</p>
                      )}
                      <p className="text-xs text-gray-500 mt-0.5">
                        {formatTime(b.startTime)} – {formatTime(b.endTime)}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

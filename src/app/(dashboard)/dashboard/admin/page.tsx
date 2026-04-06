import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  FileText,
  ClipboardList,
  Calendar,
  Building2,
  AlertTriangle,
  Clock,
} from "lucide-react";

export default async function AdminDashboardPage() {
  const session = await auth();
  if (!session) redirect("/login");
  if (session.user.role !== "ADMIN") redirect("/dashboard");

  const now = new Date();
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date(now);
  todayEnd.setHours(23, 59, 59, 999);

  const [
    ticketsOpen,
    ticketsUrgent,
    serviceOrdersPending,
    serviceOrdersOverdue,
    bookingsPending,
    spacesInMaintenance,
    recentTickets,
    recentPendingBookings,
  ] = await Promise.all([
    db.ticket.count({ where: { status: { in: ["OPEN", "IN_PROGRESS"] } } }),
    db.ticket.count({ where: { status: { in: ["OPEN", "IN_PROGRESS"] }, priority: { in: ["HIGH", "URGENT"] } } }),
    db.serviceOrder.count({ where: { status: { in: ["PENDING_APPROVAL", "APPROVED", "IN_PROGRESS"] } } }),
    db.serviceOrder.count({
      where: {
        status: { in: ["APPROVED", "IN_PROGRESS"] },
        slaDeadline: { lt: now },
      },
    }),
    db.booking.count({ where: { status: "PENDING_APPROVAL" } }),
    db.space.count({ where: { status: "MAINTENANCE" } }),
    db.ticket.findMany({
      where: { status: { in: ["OPEN", "IN_PROGRESS"] } },
      orderBy: [{ priority: "desc" }, { createdAt: "desc" }],
      take: 5,
      select: {
        id: true,
        number: true,
        description: true,
        priority: true,
        status: true,
        unit: { select: { name: true } },
      },
    }),
    db.booking.findMany({
      where: { status: "PENDING_APPROVAL" },
      orderBy: { createdAt: "asc" },
      take: 5,
      include: {
        space: { select: { name: true, unit: { select: { name: true } } } },
        user: { select: { name: true, email: true } },
      },
    }),
  ]);

  const PRIORITY_LABEL: Record<string, string> = {
    LOW: "Baixa", MEDIUM: "Média", HIGH: "Alta", URGENT: "Urgente",
  };
  const PRIORITY_CLASS: Record<string, string> = {
    LOW: "bg-gray-100 text-gray-600",
    MEDIUM: "bg-blue-100 text-blue-700",
    HIGH: "bg-orange-100 text-orange-700",
    URGENT: "bg-red-100 text-red-700",
  };
  const TICKET_STATUS_LABEL: Record<string, string> = {
    OPEN: "Aberto", IN_PROGRESS: "Em andamento", CLOSED: "Fechado",
  };

  function formatDateTime(date: Date) {
    return new Date(date).toLocaleString("pt-BR", {
      day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit",
    });
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Painel</h1>
        <p className="text-sm text-gray-500 mt-1">Visão geral do sistema</p>
      </div>

      {/* Cards de resumo */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-6">
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
              {ticketsUrgent > 0 && (
                <p className="text-xs text-red-600 mt-2 flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3" />
                  {ticketsUrgent} alta/urgente
                </p>
              )}
            </CardContent>
          </Card>
        </Link>

        <Link href="/dashboard/admin/service-orders" className="block">
          <Card className="hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs text-gray-500 font-medium">OS ativas</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">{serviceOrdersPending}</p>
                </div>
                <ClipboardList className="h-5 w-5 text-gray-400 mt-0.5" />
              </div>
              {serviceOrdersOverdue > 0 && (
                <p className="text-xs text-red-600 mt-2 flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {serviceOrdersOverdue} SLA vencido
                </p>
              )}
            </CardContent>
          </Card>
        </Link>

        <Link href="/dashboard/admin/bookings?status=PENDING_APPROVAL" className="block">
          <Card className="hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs text-gray-500 font-medium">Reservas pendentes</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">{bookingsPending}</p>
                </div>
                <Calendar className="h-5 w-5 text-gray-400 mt-0.5" />
              </div>
              {bookingsPending > 0 && (
                <p className="text-xs text-yellow-600 mt-2">Aguardando aprovação</p>
              )}
            </CardContent>
          </Card>
        </Link>

        <Link href="/dashboard/admin/spaces" className="block">
          <Card className="hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs text-gray-500 font-medium">Em manutenção</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">{spacesInMaintenance}</p>
                </div>
                <Building2 className="h-5 w-5 text-gray-400 mt-0.5" />
              </div>
              <p className="text-xs text-gray-400 mt-2">espaços bloqueados</p>
            </CardContent>
          </Card>
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Tickets abertos */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold text-gray-700">Tickets em aberto</CardTitle>
              <Link href="/dashboard/admin/tickets" className="text-xs text-yellow-700 hover:underline">
                Ver todos
              </Link>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            {recentTickets.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-6">Nenhum ticket aberto.</p>
            ) : (
              <div className="space-y-2">
                {recentTickets.map((t) => (
                  <Link
                    key={t.id}
                    href={`/dashboard/admin/tickets/${t.id}`}
                    className="flex items-start justify-between gap-2 p-2 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <div className="min-w-0">
                      <p className="text-xs font-mono text-gray-500">{t.number}</p>
                      <p className="text-sm text-gray-800 truncate">{t.description}</p>
                      <p className="text-xs text-gray-400">{t.unit.name}</p>
                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <Badge className={`text-[10px] ${PRIORITY_CLASS[t.priority]}`}>
                        {PRIORITY_LABEL[t.priority]}
                      </Badge>
                      <span className="text-[10px] text-gray-400">{TICKET_STATUS_LABEL[t.status]}</span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Reservas pendentes */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold text-gray-700">Reservas aguardando aprovação</CardTitle>
              <Link href="/dashboard/admin/bookings?status=PENDING_APPROVAL" className="text-xs text-yellow-700 hover:underline">
                Ver todas
              </Link>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            {recentPendingBookings.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-6">Nenhuma reserva pendente.</p>
            ) : (
              <div className="space-y-2">
                {recentPendingBookings.map((b) => (
                  <Link
                    key={b.id}
                    href="/dashboard/admin/bookings?status=PENDING_APPROVAL"
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
      </div>
    </div>
  );
}

import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ReportsCharts } from "@/components/shared/ReportsCharts";
import {
  FileText,
  ClipboardList,
  Calendar,
  Building2,
  AlertTriangle,
  CheckCircle2,
  Clock,
  TrendingUp,
  Download,
} from "lucide-react";

export default async function ReportsPage() {
  const session = await auth();
  if (!session) redirect("/login");
  if (session.user.role !== "ADMIN") redirect("/dashboard");

  const now = new Date();
  const thirtyDaysAgo = new Date(now);
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const [
    ticketsByStatus,
    ticketsByPriority,
    ticketsByUnit,
    osByStatus,
    osOverdue,
    bookingsByStatus,
    bookingsLast30Days,
    spacesByStatus,
    units,
    // Raw data para gráficos por dia
    osLast30Days,
    bookingsLast30DaysRaw,
  ] = await Promise.all([
    db.ticket.groupBy({ by: ["status"],   _count: true }),
    db.ticket.groupBy({ by: ["priority"], _count: true }),
    db.ticket.groupBy({
      by: ["unitId"],
      _count: true,
      where: { status: { in: ["OPEN", "IN_PROGRESS"] } },
    }),
    db.serviceOrder.groupBy({ by: ["status"], _count: true }),
    db.serviceOrder.count({
      where: { status: { in: ["APPROVED", "IN_PROGRESS"] }, slaResolutionDeadline: { lt: now } },
    }),
    db.booking.groupBy({ by: ["status"], _count: true }),
    db.booking.count({ where: { createdAt: { gte: thirtyDaysAgo } } }),
    db.space.groupBy({ by: ["status"], _count: true }),
    db.unit.findMany({ select: { id: true, name: true } }),
    db.serviceOrder.findMany({
      where: { createdAt: { gte: thirtyDaysAgo } },
      select: { createdAt: true },
    }),
    db.booking.findMany({
      where: { createdAt: { gte: thirtyDaysAgo } },
      select: { createdAt: true },
    }),
  ]);

  const unitMap = Object.fromEntries(units.map((u) => [u.id, u.name]));

  // Montar séries por dia para os gráficos
  function buildDaySeries(dates: { createdAt: Date }[]) {
    const map: Record<string, number> = {};
    for (let i = 29; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const key = `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`;
      map[key] = 0;
    }
    for (const row of dates) {
      const d = new Date(row.createdAt);
      const key = `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`;
      if (key in map) map[key]++;
    }
    return Object.entries(map).map(([date, count]) => ({ date, count }));
  }

  const osByDay       = buildDaySeries(osLast30Days);
  const bookingsByDay = buildDaySeries(bookingsLast30DaysRaw);

  const PRIORITY_COLORS: Record<string, string> = {
    LOW: "#d1d5db", MEDIUM: "#93c5fd", HIGH: "#fdba74", URGENT: "#fca5a5",
  };
  const PRIORITY_LABEL: Record<string, string> = {
    LOW: "Baixa", MEDIUM: "Média", HIGH: "Alta", URGENT: "Urgente",
  };

  const ticketsByPriorityChart = ticketsByPriority.map((r) => ({
    label: PRIORITY_LABEL[r.priority] ?? r.priority,
    count: r._count,
    color: PRIORITY_COLORS[r.priority] ?? "#e5e7eb",
  }));

  const TICKET_STATUS_LABEL: Record<string, string> = {
    OPEN: "Abertos", IN_PROGRESS: "Em andamento", CLOSED: "Fechados",
  };
  const TICKET_STATUS_CLASS: Record<string, string> = {
    OPEN: "bg-red-100 text-red-700",
    IN_PROGRESS: "bg-yellow-100 text-yellow-700",
    CLOSED: "bg-green-100 text-green-700",
  };
  const PRIORITY_CLASS: Record<string, string> = {
    LOW: "bg-gray-100 text-gray-600",
    MEDIUM: "bg-blue-100 text-blue-700",
    HIGH: "bg-orange-100 text-orange-700",
    URGENT: "bg-red-100 text-red-700",
  };
  const OS_STATUS_LABEL: Record<string, string> = {
    DRAFT: "Rascunho", PENDING_APPROVAL: "Aguard. aprovação",
    APPROVED: "Aprovadas", IN_PROGRESS: "Em andamento",
    DONE: "Concluídas", REJECTED: "Rejeitadas", CANCELLED: "Canceladas",
  };
  const OS_STATUS_CLASS: Record<string, string> = {
    DRAFT: "bg-gray-100 text-gray-600",
    PENDING_APPROVAL: "bg-yellow-100 text-yellow-700",
    APPROVED: "bg-blue-100 text-blue-700",
    IN_PROGRESS: "bg-purple-100 text-purple-700",
    DONE: "bg-green-100 text-green-700",
    REJECTED: "bg-red-100 text-red-700",
    CANCELLED: "bg-gray-100 text-gray-500",
  };
  const BOOKING_STATUS_LABEL: Record<string, string> = {
    PENDING_APPROVAL: "Pendentes", CONFIRMED: "Confirmadas",
    CANCELLED: "Canceladas", REJECTED: "Rejeitadas",
  };
  const BOOKING_STATUS_CLASS: Record<string, string> = {
    PENDING_APPROVAL: "bg-yellow-100 text-yellow-700",
    CONFIRMED: "bg-green-100 text-green-700",
    CANCELLED: "bg-gray-100 text-gray-500",
    REJECTED: "bg-red-100 text-red-700",
  };
  const SPACE_STATUS_LABEL: Record<string, string> = {
    ACTIVE: "Ativos", MAINTENANCE: "Em manutenção", INACTIVE: "Inativos",
  };
  const SPACE_STATUS_CLASS: Record<string, string> = {
    ACTIVE: "bg-green-100 text-green-700",
    MAINTENANCE: "bg-orange-100 text-orange-700",
    INACTIVE: "bg-gray-100 text-gray-500",
  };

  const totalTickets  = ticketsByStatus.reduce((s, r) => s + r._count, 0);
  const totalOS       = osByStatus.reduce((s, r) => s + r._count, 0);
  const totalBookings = bookingsByStatus.reduce((s, r) => s + r._count, 0);
  const closedTickets = ticketsByStatus.find((r) => r.status === "CLOSED")?._count ?? 0;
  const doneOS        = osByStatus.find((r) => r.status === "DONE")?._count ?? 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Relatórios</h1>
          <p className="text-sm text-gray-500 mt-1">Visão consolidada de todas as unidades</p>
        </div>
        <div className="flex gap-2">
          <Link href="/api/reports/export?type=service-orders">
            <Button variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              OS (CSV)
            </Button>
          </Link>
          <Link href="/api/reports/export?type=tickets">
            <Button variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Tickets (CSV)
            </Button>
          </Link>
        </div>
      </div>

      {/* KPIs gerais */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-gray-500 font-medium">Total de tickets</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{totalTickets}</p>
              </div>
              <FileText className="h-5 w-5 text-gray-400 mt-0.5" />
            </div>
            {totalTickets > 0 && (
              <p className="text-xs text-green-600 mt-2 flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3" />
                {Math.round((closedTickets / totalTickets) * 100)}% resolvidos
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-gray-500 font-medium">Total de OS</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{totalOS}</p>
              </div>
              <ClipboardList className="h-5 w-5 text-gray-400 mt-0.5" />
            </div>
            {osOverdue > 0 && (
              <p className="text-xs text-red-600 mt-2 flex items-center gap-1">
                <AlertTriangle className="h-3 w-3" />
                {osOverdue} com SLA vencido
              </p>
            )}
            {osOverdue === 0 && totalOS > 0 && (
              <p className="text-xs text-green-600 mt-2 flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3" />
                {Math.round((doneOS / totalOS) * 100)}% concluídas
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-gray-500 font-medium">Reservas (30 dias)</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{bookingsLast30Days}</p>
              </div>
              <TrendingUp className="h-5 w-5 text-gray-400 mt-0.5" />
            </div>
            <p className="text-xs text-gray-400 mt-2">{totalBookings} no total</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-gray-500 font-medium">SLA vencido</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{osOverdue}</p>
              </div>
              <Clock className="h-5 w-5 text-gray-400 mt-0.5" />
            </div>
            <p className={`text-xs mt-2 ${osOverdue > 0 ? "text-red-600" : "text-green-600"}`}>
              {osOverdue > 0 ? "Requer atenção" : "Tudo em dia"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Gráficos */}
      <ReportsCharts
        osByDay={osByDay}
        ticketsByPriority={ticketsByPriorityChart}
        bookingsByDay={bookingsByDay}
      />

      {/* Tabelas de breakdown */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold text-gray-700 flex items-center gap-2">
              <FileText className="h-4 w-4 text-gray-400" />
              Tickets por status
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0 space-y-2">
            {ticketsByStatus.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-4">Nenhum dado.</p>
            ) : (
              ticketsByStatus.map((row) => (
                <div key={row.status} className="flex items-center justify-between">
                  <Badge className={TICKET_STATUS_CLASS[row.status]}>
                    {TICKET_STATUS_LABEL[row.status] ?? row.status}
                  </Badge>
                  <span className="text-sm font-semibold text-gray-800">{row._count}</span>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold text-gray-700 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-gray-400" />
              Tickets por prioridade
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0 space-y-2">
            {ticketsByPriority.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-4">Nenhum dado.</p>
            ) : (
              ticketsByPriority.map((row) => (
                <div key={row.priority} className="flex items-center justify-between">
                  <Badge className={PRIORITY_CLASS[row.priority]}>
                    {PRIORITY_LABEL[row.priority] ?? row.priority}
                  </Badge>
                  <span className="text-sm font-semibold text-gray-800">{row._count}</span>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold text-gray-700 flex items-center gap-2">
              <ClipboardList className="h-4 w-4 text-gray-400" />
              Ordens de Serviço por status
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0 space-y-2">
            {osByStatus.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-4">Nenhum dado.</p>
            ) : (
              osByStatus.map((row) => (
                <div key={row.status} className="flex items-center justify-between">
                  <Badge className={OS_STATUS_CLASS[row.status]}>
                    {OS_STATUS_LABEL[row.status] ?? row.status}
                  </Badge>
                  <span className="text-sm font-semibold text-gray-800">{row._count}</span>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold text-gray-700 flex items-center gap-2">
              <Calendar className="h-4 w-4 text-gray-400" />
              Reservas por status
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0 space-y-2">
            {bookingsByStatus.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-4">Nenhum dado.</p>
            ) : (
              bookingsByStatus.map((row) => (
                <div key={row.status} className="flex items-center justify-between">
                  <Badge className={BOOKING_STATUS_CLASS[row.status]}>
                    {BOOKING_STATUS_LABEL[row.status] ?? row.status}
                  </Badge>
                  <span className="text-sm font-semibold text-gray-800">{row._count}</span>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold text-gray-700 flex items-center gap-2">
              <Building2 className="h-4 w-4 text-gray-400" />
              Espaços por status
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0 space-y-2">
            {spacesByStatus.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-4">Nenhum espaço cadastrado.</p>
            ) : (
              spacesByStatus.map((row) => (
                <div key={row.status} className="flex items-center justify-between">
                  <Badge className={SPACE_STATUS_CLASS[row.status]}>
                    {SPACE_STATUS_LABEL[row.status] ?? row.status}
                  </Badge>
                  <span className="text-sm font-semibold text-gray-800">{row._count}</span>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold text-gray-700 flex items-center gap-2">
              <FileText className="h-4 w-4 text-gray-400" />
              Tickets abertos por unidade
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0 space-y-2">
            {ticketsByUnit.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-4">Nenhum ticket aberto.</p>
            ) : (
              ticketsByUnit
                .sort((a, b) => b._count - a._count)
                .map((row) => (
                  <div key={row.unitId} className="flex items-center justify-between">
                    <span className="text-sm text-gray-700">
                      {unitMap[row.unitId] ?? row.unitId}
                    </span>
                    <span className="text-sm font-semibold text-gray-800">{row._count}</span>
                  </div>
                ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

"use client";
// Componente interativo — usa useState para navegação de mês, seleção de dia e troca de view

import { useState, useMemo } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  ChevronLeft,
  ChevronRight,
  CalendarDays,
  Zap,
  Droplets,
  Wrench,
  SprayCan,
  Clock,
  CheckCircle2,
  AlertCircle,
  Plus,
  RotateCcw,
  CalendarX,
  Bell,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface CalendarOS {
  id: string;
  number: string;
  description: string;
  serviceType: string;
  status: string;
  scheduledDate: string | null;
  isRecurring: boolean;
  maintenancePlanId: string | null;
  isPlanAlert: boolean;
  unitName: string;
  ticketNumber: string | null;
  providerName: string | null;
}

type FilterType = "agendadas" | "recorrentes" | "em_execucao" | "finalizadas";
type ViewType = "mes" | "semana" | "agenda";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const STATUS_CONFIG: Record<string, { label: string; dot: string; badge: string }> = {
  DRAFT:            { label: "Rascunho",       dot: "bg-gray-300",   badge: "bg-gray-100 text-gray-600 hover:bg-gray-100" },
  PENDING_APPROVAL: { label: "Aguardando",     dot: "bg-yellow-400", badge: "bg-yellow-100 text-yellow-700 hover:bg-yellow-100" },
  APPROVED:         { label: "Aprovada",       dot: "bg-blue-400",   badge: "bg-blue-100 text-blue-700 hover:bg-blue-100" },
  IN_PROGRESS:      { label: "Em andamento",   dot: "bg-orange-400", badge: "bg-orange-100 text-orange-700 hover:bg-orange-100" },
  DONE:             { label: "Concluída",      dot: "bg-green-400",  badge: "bg-green-100 text-green-700 hover:bg-green-100" },
  REJECTED:         { label: "Rejeitada",      dot: "bg-red-400",    badge: "bg-red-100 text-red-700 hover:bg-red-100" },
  CANCELLED:        { label: "Cancelada",      dot: "bg-gray-200",   badge: "bg-gray-100 text-gray-400 hover:bg-gray-100" },
};

const TYPE_ICON: Record<string, React.ComponentType<{ className?: string }>> = {
  CLEANING:   SprayCan,
  ELECTRICAL: Zap,
  HYDRAULIC:  Droplets,
  OTHER:      Wrench,
};

const TYPE_LABEL: Record<string, string> = {
  CLEANING:   "Limpeza",
  ELECTRICAL: "Elétrica",
  HYDRAULIC:  "Hidráulica",
  OTHER:      "Outro",
};

const WEEKDAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const MONTHS = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function buildMonthGrid(year: number, month: number): Date[] {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);

  const start = new Date(firstDay);
  start.setDate(start.getDate() - start.getDay());

  const end = new Date(lastDay);
  end.setDate(end.getDate() + (6 - end.getDay()));

  const dates: Date[] = [];
  const cur = new Date(start);
  while (cur <= end) {
    dates.push(new Date(cur));
    cur.setDate(cur.getDate() + 1);
  }
  return dates;
}

function getWeekDates(base: Date): Date[] {
  const start = new Date(base);
  start.setDate(start.getDate() - start.getDay());
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start);
    d.setDate(d.getDate() + i);
    return d;
  });
}

function toDateKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function osDateKey(os: CalendarOS) {
  return os.scheduledDate ? os.scheduledDate.split("T")[0] : null;
}

function formatFullDate(d: Date) {
  return d.toLocaleDateString("pt-BR", { day: "numeric", month: "long", year: "numeric" });
}

function formatWeekDay(d: Date) {
  return d.toLocaleDateString("pt-BR", { weekday: "long" });
}

function isToday(d: Date) {
  const today = new Date();
  return toDateKey(d) === toDateKey(today);
}

function isCurrentMonth(d: Date, month: number, year: number) {
  return d.getMonth() === month && d.getFullYear() === year;
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

interface ServiceCalendarProps {
  orders: CalendarOS[];
}

export function ServiceCalendar({ orders }: ServiceCalendarProps) {
  const today = new Date();

  const [currentMonth, setCurrentMonth] = useState(today.getMonth());
  const [currentYear, setCurrentYear]   = useState(today.getFullYear());
  const [selectedDate, setSelectedDate] = useState<Date>(today);
  const [activeFilter, setActiveFilter] = useState<FilterType>("agendadas");
  const [activeView, setActiveView]     = useState<ViewType>("mes");

  // --- Filtered orders based on active tab ---
  const filteredOrders = useMemo(() => {
    switch (activeFilter) {
      case "agendadas":
        return orders.filter(
          (os) => os.scheduledDate && !["DONE", "CANCELLED", "REJECTED"].includes(os.status)
        );
      case "recorrentes":
        return orders.filter((os) => os.maintenancePlanId !== null);
      case "em_execucao":
        return orders.filter((os) => os.status === "IN_PROGRESS");
      case "finalizadas":
        return orders.filter((os) => os.status === "DONE");
    }
  }, [orders, activeFilter]);

  // --- Indexed by date key for fast calendar lookup ---
  const ordersByDate = useMemo(() => {
    const map = new Map<string, CalendarOS[]>();
    for (const os of filteredOrders) {
      const key = osDateKey(os);
      if (!key) continue;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(os);
    }
    return map;
  }, [filteredOrders]);

  // --- Orders for the selected day ---
  const selectedDayOrders = useMemo(
    () => ordersByDate.get(toDateKey(selectedDate)) ?? [],
    [ordersByDate, selectedDate]
  );

  // --- KPIs ---
  const kpis = useMemo(() => {
    const todayKey = toDateKey(today);
    const weekStart = new Date(today);
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);

    return {
      hoje: orders.filter((os) => osDateKey(os) === todayKey).length,
      semana: orders.filter((os) => {
        const k = osDateKey(os);
        if (!k) return false;
        const d = new Date(k);
        return d >= weekStart && d <= weekEnd;
      }).length,
      emExecucao: orders.filter((os) => os.status === "IN_PROGRESS").length,
      alertasPlano: orders.filter((os) => os.isPlanAlert).length,
    };
  }, [orders]);

  // --- Navigation ---
  function prevMonth() {
    if (currentMonth === 0) { setCurrentMonth(11); setCurrentYear((y) => y - 1); }
    else setCurrentMonth((m) => m - 1);
  }
  function nextMonth() {
    if (currentMonth === 11) { setCurrentMonth(0); setCurrentYear((y) => y + 1); }
    else setCurrentMonth((m) => m + 1);
  }
  function goToday() {
    setCurrentMonth(today.getMonth());
    setCurrentYear(today.getFullYear());
    setSelectedDate(today);
  }

  const monthGrid   = useMemo(() => buildMonthGrid(currentYear, currentMonth), [currentYear, currentMonth]);
  const weekDates   = useMemo(() => getWeekDates(selectedDate), [selectedDate]);

  // ---------------------------------------------------------------------------
  // Render helpers
  // ---------------------------------------------------------------------------

  function DotRow({ dayOrders }: { dayOrders: CalendarOS[] }) {
    const visible = dayOrders.slice(0, 3);
    const overflow = dayOrders.length - 3;
    return (
      <div className="flex gap-0.5 items-center mt-1 flex-wrap">
        {visible.map((os) => (
          <span
            key={os.id}
            className={`inline-block h-1.5 w-1.5 rounded-full ${STATUS_CONFIG[os.status]?.dot ?? "bg-gray-300"}`}
          />
        ))}
        {overflow > 0 && (
          <span className="text-[9px] text-gray-400 leading-none">+{overflow}</span>
        )}
      </div>
    );
  }

  function OSCard({ os }: { os: CalendarOS }) {
    const Icon = TYPE_ICON[os.serviceType] ?? Wrench;
    const cfg  = STATUS_CONFIG[os.status] ?? STATUS_CONFIG.DRAFT;
    return (
      <Link
        href={`/dashboard/admin/service-orders/${os.id}`}
        className={`block p-3 rounded-lg border transition-colors ${
          os.isPlanAlert
            ? "border-amber-200 bg-amber-50 hover:bg-amber-100"
            : "border-gray-100 hover:border-gray-200 hover:bg-gray-50"
        }`}
      >
        <div className="flex items-start justify-between gap-2 mb-1">
          <div className="flex items-center gap-1.5 min-w-0">
            <Icon className="h-3.5 w-3.5 text-gray-400 shrink-0" />
            <span className="text-xs font-mono text-gray-500 shrink-0">{os.number}</span>
            {os.isPlanAlert && (
              <Bell className="h-3 w-3 text-amber-500 shrink-0" aria-label="Preventiva pendente" />
            )}
          </div>
          <Badge className={`text-[10px] shrink-0 ${cfg.badge}`}>{cfg.label}</Badge>
        </div>
        <p className="text-sm text-gray-800 line-clamp-2">{os.description}</p>
        <div className="mt-2 flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] text-gray-400">
          <span>{os.unitName}</span>
          {os.providerName && <span>{os.providerName}</span>}
          {os.maintenancePlanId !== null && (
            <span className="flex items-center gap-0.5 text-amber-600">
              <RotateCcw className="h-2.5 w-2.5" /> Preventiva
            </span>
          )}
          {os.isRecurring && os.maintenancePlanId === null && (
            <span className="flex items-center gap-0.5 text-blue-500">
              <RotateCcw className="h-2.5 w-2.5" /> Recorrente
            </span>
          )}
        </div>
      </Link>
    );
  }

  // ---------------------------------------------------------------------------
  // Views
  // ---------------------------------------------------------------------------

  function MonthView() {
    return (
      <div className="flex-1 min-w-0">
        <div className="grid grid-cols-7 border-b border-gray-100">
          {WEEKDAYS.map((d) => (
            <div key={d} className="py-2 text-center text-xs font-semibold text-gray-400 uppercase tracking-wide">
              {d}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {monthGrid.map((day, i) => {
            const key       = toDateKey(day);
            const dayOrders = ordersByDate.get(key) ?? [];
            const inMonth   = isCurrentMonth(day, currentMonth, currentYear);
            const selected  = toDateKey(day) === toDateKey(selectedDate);
            const todayDay  = isToday(day);

            return (
              <button
                key={i}
                onClick={() => setSelectedDate(day)}
                className={`min-h-[80px] p-1.5 border-b border-r border-gray-50 text-left transition-colors ${
                  selected
                    ? "bg-yellow-50"
                    : "hover:bg-gray-50"
                } ${i % 7 === 0 ? "border-l-0" : ""}`}
              >
                <span
                  className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-sm font-medium ${
                    todayDay
                      ? "bg-yellow-400 text-white font-bold"
                      : inMonth
                      ? "text-gray-800"
                      : "text-gray-300"
                  }`}
                >
                  {day.getDate()}
                </span>
                {dayOrders.length > 0 && <DotRow dayOrders={dayOrders} />}
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  function WeekView() {
    return (
      <div className="flex-1 min-w-0">
        <div className="grid grid-cols-7 border-b border-gray-100">
          {weekDates.map((day, i) => (
            <div
              key={i}
              className={`py-3 text-center border-r border-gray-50 last:border-r-0 ${
                isToday(day) ? "bg-yellow-50" : ""
              }`}
            >
              <p className="text-xs text-gray-400 uppercase tracking-wide">{WEEKDAYS[i]}</p>
              <span
                className={`mt-1 inline-flex h-7 w-7 items-center justify-center rounded-full text-sm font-semibold ${
                  isToday(day) ? "bg-yellow-400 text-white" : "text-gray-700"
                }`}
              >
                {day.getDate()}
              </span>
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {weekDates.map((day, i) => {
            const dayOrders = ordersByDate.get(toDateKey(day)) ?? [];
            return (
              <div
                key={i}
                className="min-h-[200px] p-2 border-r border-gray-50 last:border-r-0 space-y-1.5"
              >
                {dayOrders.map((os) => {
                  const Icon = TYPE_ICON[os.serviceType] ?? Wrench;
                  const cfg  = STATUS_CONFIG[os.status] ?? STATUS_CONFIG.DRAFT;
                  return (
                    <Link
                      key={os.id}
                      href={`/dashboard/admin/service-orders/${os.id}`}
                      className="block rounded p-1.5 text-[11px] leading-tight hover:opacity-80 transition-opacity"
                      style={{ background: "rgb(254 249 195)" }}
                    >
                      <div className="flex items-center gap-1 mb-0.5">
                        <Icon className="h-3 w-3 shrink-0" />
                        <span className="font-mono text-gray-500">{os.number}</span>
                      </div>
                      <p className="line-clamp-2 text-gray-700">{os.description}</p>
                      <Badge className={`mt-1 text-[9px] ${cfg.badge}`}>{cfg.label}</Badge>
                    </Link>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  function AgendaView() {
    const sorted = [...filteredOrders]
      .filter((os) => os.scheduledDate)
      .sort((a, b) => (a.scheduledDate! > b.scheduledDate! ? 1 : -1));

    if (sorted.length === 0) {
      return (
        <div className="flex-1 flex flex-col items-center justify-center py-20 text-gray-400">
          <CalendarX className="h-10 w-10 mb-3" />
          <p className="text-sm">Nenhuma OS agendada encontrada.</p>
        </div>
      );
    }

    let lastKey = "";
    return (
      <div className="flex-1 min-w-0 space-y-1 pb-4">
        {sorted.map((os) => {
          const key     = osDateKey(os)!;
          const date    = new Date(os.scheduledDate!);
          const showSep = key !== lastKey;
          lastKey = key;
          return (
            <div key={os.id}>
              {showSep && (
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider pt-4 pb-2 px-1 border-b border-gray-100">
                  {date.toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" })}
                </p>
              )}
              <div className="pl-2">
                <OSCard os={os} />
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // Day panel (right side)
  // ---------------------------------------------------------------------------

  function DayPanel() {
    return (
      <div className="w-72 shrink-0 border-l border-gray-100 pl-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-sm font-semibold text-gray-900">{formatFullDate(selectedDate)}</p>
            <p className="text-xs text-gray-400 capitalize">{formatWeekDay(selectedDate)}</p>
          </div>
          <Link
            href="/dashboard/admin/tickets"
            className="flex items-center gap-1 rounded-lg bg-yellow-400 px-2.5 py-1.5 text-xs font-semibold text-gray-900 hover:bg-yellow-300 transition-colors"
          >
            <Plus className="h-3.5 w-3.5" />
            Nova OS
          </Link>
        </div>

        {selectedDayOrders.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-center text-gray-400">
            <CalendarDays className="h-8 w-8 mb-2 text-gray-200" />
            <p className="text-sm font-medium text-gray-500">Nenhum serviço</p>
            <p className="text-xs mt-1">Não há serviços agendados para este dia.</p>
            <Link
              href="/dashboard/admin/tickets"
              className="mt-4 flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-2 text-xs font-medium text-gray-600 hover:bg-gray-50 transition-colors"
            >
              <Plus className="h-3.5 w-3.5" />
              Criar Ordem de Serviço
            </Link>
            <Link
              href="/dashboard/admin/providers"
              className="mt-2 flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-2 text-xs font-medium text-gray-600 hover:bg-gray-50 transition-colors"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Gerenciar Recorrentes
            </Link>
          </div>
        ) : (
          <div className="space-y-2">
            {selectedDayOrders.map((os) => (
              <OSCard key={os.id} os={os} />
            ))}
          </div>
        )}
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // Root render
  // ---------------------------------------------------------------------------

  const filters: { key: FilterType; label: string; icon?: React.ReactNode }[] = [
    { key: "agendadas",   label: "OS Agendadas" },
    { key: "recorrentes", label: "Recorrentes",  icon: <RotateCcw className="h-3.5 w-3.5" /> },
    { key: "em_execucao", label: "Em Execução",  icon: <Clock className="h-3.5 w-3.5" /> },
    { key: "finalizadas", label: "Finalizadas",  icon: <CheckCircle2 className="h-3.5 w-3.5" /> },
  ];

  return (
    <div className="space-y-5">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Calendário de Serviços</h1>
        <p className="text-sm text-gray-500 mt-1">Visualize todos os serviços programados e em execução</p>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          { label: "Hoje",            value: kpis.hoje,          icon: <CalendarDays className="h-5 w-5 text-gray-300" /> },
          { label: "Esta Semana",     value: kpis.semana,        icon: <CalendarDays className="h-5 w-5 text-gray-300" /> },
          { label: "Em Execução",     value: kpis.emExecucao,    icon: <Clock className="h-5 w-5 text-orange-300" />,
            alert: kpis.emExecucao > 0 },
          { label: "Alertas Preventiva", value: kpis.alertasPlano, icon: <Bell className="h-5 w-5 text-amber-400" />,
            alert: kpis.alertasPlano > 0 },
        ].map((kpi) => (
          <Card key={kpi.label}>
            <CardContent className="p-4 flex items-center gap-3">
              {kpi.icon}
              <div>
                <p className={`text-2xl font-bold ${kpi.alert ? "text-orange-600" : "text-gray-900"}`}>
                  {kpi.value}
                </p>
                <p className="text-xs text-gray-400">{kpi.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters + view switcher */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Filter tabs */}
        <div className="flex flex-wrap gap-1.5">
          {filters.map((f) => (
            <button
              key={f.key}
              onClick={() => setActiveFilter(f.key)}
              className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
                activeFilter === f.key
                  ? "bg-yellow-100 text-yellow-800 ring-1 ring-yellow-300"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {f.icon}
              {f.label}
            </button>
          ))}
        </div>

        {/* View + navigation */}
        <div className="flex items-center gap-2">
          {/* View switcher */}
          <div className="flex rounded-lg border border-gray-200 overflow-hidden text-sm">
            {(["mes", "semana", "agenda"] as ViewType[]).map((v) => (
              <button
                key={v}
                onClick={() => setActiveView(v)}
                className={`px-3 py-1.5 font-medium transition-colors ${
                  activeView === v
                    ? "bg-gray-900 text-white"
                    : "text-gray-600 hover:bg-gray-50"
                }`}
              >
                {{ mes: "Mês", semana: "Semana", agenda: "Agenda" }[v]}
              </button>
            ))}
          </div>

          {/* Month navigation (only for mes/semana) */}
          {activeView !== "agenda" && (
            <div className="flex items-center gap-1">
              <button
                onClick={prevMonth}
                className="rounded-lg border border-gray-200 p-1.5 hover:bg-gray-50 transition-colors"
              >
                <ChevronLeft className="h-4 w-4 text-gray-600" />
              </button>
              <button
                onClick={goToday}
                className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50 transition-colors"
              >
                Hoje
              </button>
              <button
                onClick={nextMonth}
                className="rounded-lg border border-gray-200 p-1.5 hover:bg-gray-50 transition-colors"
              >
                <ChevronRight className="h-4 w-4 text-gray-600" />
              </button>
              <span className="text-sm font-semibold text-gray-700 min-w-[120px] text-center">
                {MONTHS[currentMonth]} {currentYear}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Main area */}
      <div className={`flex gap-5 ${activeView === "agenda" ? "" : "items-start"}`}>
        {/* Calendar / Agenda */}
        <Card className="flex-1 min-w-0 overflow-hidden">
          <CardContent className="p-0">
            {activeView === "mes"    && <MonthView />}
            {activeView === "semana" && <WeekView />}
            {activeView === "agenda" && <div className="p-4"><AgendaView /></div>}
          </CardContent>
        </Card>

        {/* Day panel — hidden in agenda view */}
        {activeView !== "agenda" && <DayPanel />}
      </div>
    </div>
  );
}

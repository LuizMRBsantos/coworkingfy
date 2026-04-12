"use client";
// Client Component necessário para recharts (manipula DOM para dimensionar gráficos)

import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
  PieChart, Pie, Legend,
} from "recharts";

interface DayCount {
  date:  string; // "dd/MM"
  count: number;
}

interface StatusCount {
  label: string;
  count: number;
  color: string;
}

interface ReportsChartsProps {
  osByDay:          DayCount[];
  ticketsByPriority: StatusCount[];
  bookingsByDay:    DayCount[];
}

function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: {value: number}[]; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-gray-100 rounded-lg shadow-sm px-3 py-2 text-sm">
      <p className="text-gray-500 text-xs mb-0.5">{label}</p>
      <p className="font-semibold text-gray-900">{payload[0].value}</p>
    </div>
  );
}

export function ReportsCharts({ osByDay, ticketsByPriority, bookingsByDay }: ReportsChartsProps) {
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {/* OS criadas por dia (últimos 30 dias) */}
      <div className="bg-white rounded-xl border border-gray-100 p-5">
        <p className="text-sm font-semibold text-gray-700 mb-4">OS criadas — últimos 30 dias</p>
        {osByDay.every((d) => d.count === 0) ? (
          <p className="text-sm text-gray-400 text-center py-8">Nenhuma OS criada no período.</p>
        ) : (
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={osByDay} barSize={8}>
              <XAxis
                dataKey="date"
                tick={{ fontSize: 10, fill: "#9ca3af" }}
                axisLine={false}
                tickLine={false}
                interval={6}
              />
              <YAxis
                tick={{ fontSize: 10, fill: "#9ca3af" }}
                axisLine={false}
                tickLine={false}
                allowDecimals={false}
                width={24}
              />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: "#f9fafb" }} />
              <Bar dataKey="count" fill="#facc15" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Tickets por prioridade — pizza */}
      <div className="bg-white rounded-xl border border-gray-100 p-5">
        <p className="text-sm font-semibold text-gray-700 mb-4">Tickets por prioridade</p>
        {ticketsByPriority.every((d) => d.count === 0) ? (
          <p className="text-sm text-gray-400 text-center py-8">Nenhum ticket cadastrado.</p>
        ) : (
          <ResponsiveContainer width="100%" height={180}>
            <PieChart>
              <Pie
                data={ticketsByPriority}
                dataKey="count"
                nameKey="label"
                cx="50%"
                cy="50%"
                outerRadius={65}
                innerRadius={35}
                paddingAngle={2}
              >
                {ticketsByPriority.map((entry, i) => (
                  <Cell key={i} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip formatter={(value) => [value, ""]} />
              <Legend
                iconType="circle"
                iconSize={8}
                formatter={(value) => <span style={{ fontSize: 11, color: "#6b7280" }}>{value}</span>}
              />
            </PieChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Reservas por dia (últimos 30 dias) */}
      <div className="bg-white rounded-xl border border-gray-100 p-5 lg:col-span-2">
        <p className="text-sm font-semibold text-gray-700 mb-4">Reservas criadas — últimos 30 dias</p>
        {bookingsByDay.every((d) => d.count === 0) ? (
          <p className="text-sm text-gray-400 text-center py-8">Nenhuma reserva criada no período.</p>
        ) : (
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={bookingsByDay} barSize={8}>
              <XAxis
                dataKey="date"
                tick={{ fontSize: 10, fill: "#9ca3af" }}
                axisLine={false}
                tickLine={false}
                interval={6}
              />
              <YAxis
                tick={{ fontSize: 10, fill: "#9ca3af" }}
                axisLine={false}
                tickLine={false}
                allowDecimals={false}
                width={24}
              />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: "#f9fafb" }} />
              <Bar dataKey="count" fill="#60a5fa" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}

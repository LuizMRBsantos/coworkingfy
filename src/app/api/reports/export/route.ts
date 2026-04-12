import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { withAuth } from "@/lib/rbac";

const TypeSchema = z.enum(["service-orders", "tickets"]);

function toCsv(rows: Record<string, unknown>[]): string {
  if (rows.length === 0) return "";
  const headers = Object.keys(rows[0]);
  const lines = [
    headers.join(","),
    ...rows.map((row) =>
      headers
        .map((h) => {
          const val = String(row[h] ?? "");
          return val.includes(",") || val.includes('"') || val.includes("\n")
            ? `"${val.replace(/"/g, '""')}"`
            : val;
        })
        .join(","),
    ),
  ];
  return lines.join("\n");
}

export const GET = withAuth(
  async (req) => {
    const params     = req.nextUrl.searchParams;
    const typeParsed = TypeSchema.safeParse(params.get("type"));

    if (!typeParsed.success) {
      return NextResponse.json({ error: "Tipo inválido. Use: service-orders ou tickets" }, { status: 400 });
    }

    const type = typeParsed.data;

    if (type === "service-orders") {
      const rows = await db.serviceOrder.findMany({
        orderBy: { createdAt: "desc" },
        select: {
          number:       true,
          status:       true,
          serviceType:  true,
          description:  true,
          scheduledDate: true,
          slaAttendanceDeadline: true,
          slaResolutionDeadline: true,
          createdAt:    true,
          unit:     { select: { name: true } },
          ticket:   { select: { number: true, priority: true } },
          provider: { select: { name: true } },
          createdBy: { select: { name: true, email: true } },
        },
      });

      const csv = toCsv(
        rows.map((r) => ({
          numero:          r.number,
          status:          r.status,
          tipo_servico:    r.serviceType,
          descricao:       r.description,
          ticket:          r.ticket?.number ?? "",
          prioridade:      r.ticket?.priority ?? "",
          unidade:         r.unit.name,
          prestador:       r.provider?.name ?? "",
          data_agendada:   r.scheduledDate ? new Date(r.scheduledDate).toLocaleDateString("pt-BR") : "",
          prazo_atendimento: r.slaAttendanceDeadline ? new Date(r.slaAttendanceDeadline).toLocaleDateString("pt-BR") : "",
          prazo_resolucao:   r.slaResolutionDeadline ? new Date(r.slaResolutionDeadline).toLocaleDateString("pt-BR") : "",
          criado_por:      r.createdBy.name ?? r.createdBy.email,
          criado_em:       new Date(r.createdAt).toLocaleDateString("pt-BR"),
        })),
      );

      return new NextResponse("\uFEFF" + csv, {
        headers: {
          "Content-Type":        "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="os-${new Date().toISOString().slice(0, 10)}.csv"`,
        },
      });
    }

    // tickets
    const rows = await db.ticket.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        number:      true,
        status:      true,
        priority:    true,
        description: true,
        externalTicketId: true,
        createdAt:   true,
        updatedAt:   true,
        unit:        { select: { name: true } },
        createdBy:   { select: { name: true, email: true } },
        _count:      { select: { serviceOrders: true } },
      },
    });

    const csv = toCsv(
      rows.map((r) => ({
        numero:           r.number,
        ticket_externo:   r.externalTicketId ?? "",
        status:           r.status,
        prioridade:       r.priority,
        descricao:        r.description,
        unidade:          r.unit.name,
        ordens_servico:   r._count.serviceOrders,
        criado_por:       r.createdBy.name ?? r.createdBy.email,
        criado_em:        new Date(r.createdAt).toLocaleDateString("pt-BR"),
        atualizado_em:    new Date(r.updatedAt).toLocaleDateString("pt-BR"),
      })),
    );

    return new NextResponse("\uFEFF" + csv, {
      headers: {
        "Content-Type":        "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="tickets-${new Date().toISOString().slice(0, 10)}.csv"`,
      },
    });
  },
  ["ADMIN"],
);

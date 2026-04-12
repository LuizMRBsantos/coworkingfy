import type { Priority, ServiceOrderStatus, TicketStatus } from "@prisma/client";

// ---------------------------------------------------------------------------
// Tipos de entrada
// ---------------------------------------------------------------------------

export interface HealthTicket {
  priority:  Priority;
  status:    TicketStatus;
}

export interface HealthServiceOrder {
  status:                ServiceOrderStatus;
  slaAttendanceDeadline: Date | null;
  slaResolutionDeadline: Date | null;
  startedAt:             Date | null;
  completedAt:           Date | null;
  validatedAt:           Date | null;
  createdAt:             Date;
}

export interface HealthMaintenancePlan {
  nextRunAt: Date;
  isActive:  boolean;
}

// ---------------------------------------------------------------------------
// Resultado do score
// ---------------------------------------------------------------------------

export interface HealthScore {
  score:        number;             // 0–100
  band:         "green" | "yellow" | "red" | "none";
  urgentOpen:   number;
  highOpen:     number;
  slaBreached:  number;
  pmocOverdue:  number;
  pmocDueSoon:  number;
  activeOrders: number;
}

// ---------------------------------------------------------------------------
// Algoritmo
// ---------------------------------------------------------------------------

const OPEN_STATUSES: ServiceOrderStatus[] = ["DRAFT", "PENDING_APPROVAL", "APPROVED", "IN_PROGRESS"];

export function computeHealthScore(
  tickets:          HealthTicket[],
  serviceOrders:    HealthServiceOrder[],
  maintenancePlans: HealthMaintenancePlan[],
): HealthScore {
  if (maintenancePlans.length === 0 && tickets.length === 0 && serviceOrders.length === 0) {
    return { score: 100, band: "none", urgentOpen: 0, highOpen: 0, slaBreached: 0, pmocOverdue: 0, pmocDueSoon: 0, activeOrders: 0 };
  }

  const now = new Date();
  const in7d = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  let deductions = 0;

  // --- Tickets abertos por prioridade ---
  const urgentOpen = tickets.filter(
    (t) => t.status !== "CLOSED" && t.priority === "URGENT",
  ).length;
  const highOpen = tickets.filter(
    (t) => t.status !== "CLOSED" && t.priority === "HIGH",
  ).length;

  deductions += urgentOpen * 30;
  deductions += highOpen  * 15;

  // --- SLA de OS ---
  let slaBreached    = 0;
  let attendBreached = 0;
  const activeOrders = serviceOrders.filter((o) => OPEN_STATUSES.includes(o.status)).length;

  for (const os of serviceOrders) {
    if (!OPEN_STATUSES.includes(os.status)) continue;

    // SLA resolução vencido
    if (os.slaResolutionDeadline && os.slaResolutionDeadline < now) {
      slaBreached++;
      const priority =
        urgentOpen > 0 ? "URGENT" : highOpen > 0 ? "HIGH" : "MEDIUM";
      deductions += priority === "URGENT" ? 30 : priority === "HIGH" ? 15 : 5;
    }

    // SLA atendimento vencido (ainda em APPROVED sem ter entrado em IN_PROGRESS)
    if (os.slaAttendanceDeadline && os.slaAttendanceDeadline < now && !os.startedAt) {
      attendBreached++;
      deductions += 10;
    }
  }

  // Ordens MEDIUM/LOW abertas sem SLA mas já antigas (> 7 dias)
  for (const os of serviceOrders) {
    if (!OPEN_STATUSES.includes(os.status)) continue;
    if (!os.slaResolutionDeadline) {
      const ageMs = now.getTime() - new Date(os.createdAt).getTime();
      if (ageMs > 7 * 24 * 60 * 60 * 1000) deductions += 5;
    }
  }

  // --- Bônus: OS preventivas VALIDATED este mês ---
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const validatedThisMonth = serviceOrders.filter(
    (o) => o.status === "VALIDATED" && o.validatedAt && o.validatedAt >= startOfMonth,
  ).length;
  const bonus = Math.min(validatedThisMonth * 2, 10);

  // --- PMOC ---
  let pmocOverdue  = 0;
  let pmocDueSoon  = 0;

  for (const plan of maintenancePlans) {
    if (!plan.isActive) continue;
    if (plan.nextRunAt < now) {
      pmocOverdue++;
      deductions += 10;
    } else if (plan.nextRunAt <= in7d) {
      pmocDueSoon++;
      deductions += 2;
    }
  }

  const raw   = Math.max(0, 100 - deductions + bonus);
  const score = Math.min(100, Math.round(raw));

  const band: HealthScore["band"] =
    score >= 80 ? "green"
    : score >= 50 ? "yellow"
    : "red";

  return {
    score,
    band,
    urgentOpen,
    highOpen,
    slaBreached: slaBreached + attendBreached,
    pmocOverdue,
    pmocDueSoon,
    activeOrders,
  };
}

import type { Priority } from "@prisma/client";

// ---------------------------------------------------------------------------
// Paginação
// ---------------------------------------------------------------------------

/** Itens por página nas listagens. */
export const PAGE_SIZE = 20;

// ---------------------------------------------------------------------------
// Horário de funcionamento do coworking
// ---------------------------------------------------------------------------

export const OPEN_HOUR  = 7;   // 07h00
export const CLOSE_HOUR = 22;  // 22h00

// ---------------------------------------------------------------------------
// Reservas
// ---------------------------------------------------------------------------

/** Duração mínima de uma reserva em minutos. */
export const MIN_DURATION_MINUTES = 30;

/**
 * Horas de antecedência mínima para cancelar uma reserva CONFIRMED.
 * Configurável via variável de ambiente CANCEL_HOURS_BEFORE.
 */
export const CANCEL_HOURS_BEFORE = Number(process.env.CANCEL_HOURS_BEFORE ?? 2);

// ---------------------------------------------------------------------------
// SLA em HORAS ÚTEIS por prioridade
// ---------------------------------------------------------------------------

/** Prazo de atendimento: tempo até a 1ª ação na OS (IN_PROGRESS). */
export const SLA_ATTENDANCE: Record<Priority, number> = {
  URGENT: 2,
  HIGH:   8,
  MEDIUM: 36,
  LOW:    72,
};

/** Prazo de resolução: tempo até a OS ser marcada como DONE/VALIDATED. */
export const SLA_RESOLUTION: Record<Priority, number> = {
  URGENT: 4,
  HIGH:   24,
  MEDIUM: 48,
  LOW:    96,
};

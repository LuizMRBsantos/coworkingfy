import { TZDate } from "@date-fns/tz";

// ---------------------------------------------------------------------------
// Timezone central do negócio — todas as validações de horário usam este fuso
// ---------------------------------------------------------------------------

export const BUSINESS_TIMEZONE = "America/Sao_Paulo";

/**
 * Converte uma string ISO-8601 (ou Date UTC) para um TZDate no fuso do negócio.
 * Isso garante que getHours(), getMinutes() etc. retornem valores no horário local
 * independente do fuso da máquina (Vercel roda em UTC).
 */
export function toBusinessTZ(date: string | Date): TZDate {
  const iso = typeof date === "string" ? date : date.toISOString();
  return new TZDate(iso, BUSINESS_TIMEZONE);
}

/**
 * Retorna a hora decimal (ex: 14.5 para 14:30) no fuso do negócio.
 */
export function getBusinessHour(date: string | Date): number {
  const tz = toBusinessTZ(date);
  return tz.getHours() + tz.getMinutes() / 60;
}

/**
 * Retorna o instante atual no fuso do negócio.
 */
export function nowInBusinessTZ(): TZDate {
  return new TZDate(new Date(), BUSINESS_TIMEZONE);
}

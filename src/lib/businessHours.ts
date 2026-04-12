/**
 * Utilitários de horas úteis
 * Horário comercial: seg–sex 08h–18h (configurável via constantes)
 */

export const BUSINESS_HOURS = {
  start: 8,              // 08:00
  end:   18,             // 18:00
  days:  [1, 2, 3, 4, 5], // seg=1 a sex=5 (domingo=0, sábado=6)
} as const;

/** Avança `hours` horas úteis a partir de `from` e retorna o novo Date. */
export function addBusinessHours(from: Date, hours: number): Date {
  let remaining = hours;
  const result  = new Date(from);

  // Se começa fora do horário de trabalho, avança para o próximo início
  result.setTime(normalizeToBusinessStart(result).getTime());

  while (remaining > 0) {
    if (!isBusinessDay(result)) {
      advanceToNextBusinessDay(result);
      continue;
    }

    const endOfDay    = new Date(result);
    endOfDay.setHours(BUSINESS_HOURS.end, 0, 0, 0);

    const hoursUntilEnd = (endOfDay.getTime() - result.getTime()) / (1000 * 60 * 60);

    if (remaining <= hoursUntilEnd) {
      result.setTime(result.getTime() + remaining * 60 * 60 * 1000);
      remaining = 0;
    } else {
      remaining -= hoursUntilEnd;
      advanceToNextBusinessDay(result);
    }
  }

  return result;
}

/**
 * Calcula quantas horas úteis existem entre `from` e `to`.
 * Retorna 0 se `to` <= `from`.
 */
export function businessHoursBetween(from: Date, to: Date): number {
  if (to <= from) return 0;

  let total = 0;
  const cursor = normalizeToBusinessStart(new Date(from));

  while (cursor < to) {
    if (!isBusinessDay(cursor)) {
      advanceToNextBusinessDay(cursor);
      continue;
    }

    const startOfDay = new Date(cursor);
    startOfDay.setHours(BUSINESS_HOURS.start, 0, 0, 0);
    const endOfDay = new Date(cursor);
    endOfDay.setHours(BUSINESS_HOURS.end, 0, 0, 0);

    const effectiveStart = cursor > startOfDay ? cursor : startOfDay;
    const effectiveEnd   = to < endOfDay ? to : endOfDay;

    if (effectiveEnd > effectiveStart) {
      total += (effectiveEnd.getTime() - effectiveStart.getTime()) / (1000 * 60 * 60);
    }

    advanceToNextBusinessDay(cursor);
  }

  return total;
}

// ---------------------------------------------------------------------------
// Helpers internos
// ---------------------------------------------------------------------------

function isBusinessDay(date: Date): boolean {
  return (BUSINESS_HOURS.days as readonly number[]).includes(date.getDay());
}

function normalizeToBusinessStart(date: Date): Date {
  const result = new Date(date);

  // Se for final de semana, avança para segunda
  while (!isBusinessDay(result)) {
    result.setDate(result.getDate() + 1);
    result.setHours(BUSINESS_HOURS.start, 0, 0, 0);
  }

  // Se antes do horário de início, vai para o início
  if (result.getHours() < BUSINESS_HOURS.start) {
    result.setHours(BUSINESS_HOURS.start, 0, 0, 0);
  }

  // Se depois do horário de fim, avança para o próximo dia útil
  if (result.getHours() >= BUSINESS_HOURS.end) {
    result.setDate(result.getDate() + 1);
    result.setHours(BUSINESS_HOURS.start, 0, 0, 0);
    while (!isBusinessDay(result)) {
      result.setDate(result.getDate() + 1);
    }
  }

  return result;
}

function advanceToNextBusinessDay(date: Date): void {
  date.setDate(date.getDate() + 1);
  date.setHours(BUSINESS_HOURS.start, 0, 0, 0);
  while (!isBusinessDay(date)) {
    date.setDate(date.getDate() + 1);
  }
}

import type { CalendarData } from "@/shared/types";
import type { LocalDate } from "@/shared/types/local-date";
import { localDate as ld } from "@/shared/types/local-date";
import { Temporal } from "@js-temporal/polyfill";

/** Государственные праздники РФ по ст. 112 ТК РФ [месяц, день]. Не включает 1–7 января — они обрабатываются отдельно. */
const STATE_HOLIDAYS: readonly [number, number][] = [
  [2, 23],
  [3, 8],
  [5, 1],
  [5, 9],
  [6, 12],
  [11, 4],
];

/** Проверяет, является ли дата государственным праздником (ст. 112 ТК РФ). */
function isStateHoliday(date: LocalDate): boolean {
  if (date.month === 1 && date.day <= 7) return true;
  return STATE_HOLIDAYS.some(([m, d]) => m === date.month && d === date.day);
}

/** Определяет выходной: 6 — суббота, 7 — воскресенье (ISO 8601, Temporal dayOfWeek). */
function isWeekend(date: LocalDate): boolean {
  const dow = date.dayOfWeek;
  return dow === 6 || dow === 7;
}

/** Форматирует LocalDate в формат YYYYMMDD. */
function formatDate(ld: LocalDate): string {
  return ld.toString().replace(/-/g, "");
}

/** Генерирует fallback-календарь: выходные (код 1), праздники ст. 112 ТК РФ (код 8), рабочие дни (код 0). */
export function generateFallbackCalendar(year: number): CalendarData {
  const data = new Map<string, number>();
  let date = ld(year, 1, 1);
  const endOfYear = ld(year, 12, 31);

  while (Temporal.PlainDate.compare(date, endOfYear) <= 0) {
    if (isStateHoliday(date)) {
      data.set(formatDate(date), 8);
    } else if (isWeekend(date)) {
      data.set(formatDate(date), 1);
    } else {
      data.set(formatDate(date), 0);
    }
    date = date.add({ days: 1 });
  }

  return data;
}

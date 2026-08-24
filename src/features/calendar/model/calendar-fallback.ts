import type { CalendarData } from "@/shared/types";
import type { LocalDate } from "@/shared/types/local-date";
import { localDate as ld } from "@/shared/types/local-date";
import { getYearHolidays } from "@/shared/lib/yearSettings";
import { Temporal } from "@js-temporal/polyfill";

/** Проверяет, является ли дата государственным праздником (ст. 112 ТК РФ, список из yearSettings). */
function isStateHoliday(date: LocalDate): boolean {
  return getYearHolidays(date.year).some(
    ([m, d]) => m === date.month && d === date.day,
  );
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

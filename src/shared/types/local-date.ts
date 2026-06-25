import { Temporal } from "@js-temporal/polyfill";
import { z } from "zod";

export type LocalDate = Temporal.PlainDate;

/** Zod-схема: строка "YYYY-MM-DD" или готовый PlainDate → PlainDate. */
export const LocalDateSchema = z.union([
  z.instanceof(Temporal.PlainDate),
  z.string().transform((s) => Temporal.PlainDate.from(s)),
]);

/** Создаёт PlainDate из year/month/day (month 1-based). */
export function localDate(year: number, month: number, day: number): LocalDate {
  return Temporal.PlainDate.from({ year, month, day });
}

/** Текущая дата. */
export const today = () => Temporal.Now.plainDateTimeISO().toPlainDate();

/** Конвертирует PlainDate → Date (для date-fns форматирования в UI). */
export function localToDate(ld: LocalDate): Date {
  return new Date(ld.toString());
}

/** Форматирует дату как "YYYY-MM-DD" (совпадает с CalendarData key). */
export function formatDateKey(ld: LocalDate): string {
  return ld.toString();
}

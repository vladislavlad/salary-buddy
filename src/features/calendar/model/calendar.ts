import type { CalendarData } from "@/shared/types";
import type { LocalDate } from "@/shared/types/local-date";
import { Temporal } from "@js-temporal/polyfill";
import { generateFallbackCalendar } from "./calendar-fallback";
import { isdayoffFetch } from "./isdayoff-fetch";

/** Форматирует LocalDate в формат YYYYMMDD. */
function formatDate(ld: LocalDate): string {
  return ld.toString().replace(/-/g, "");
}

/** Загружает календарь за год: сначала isdayoff.ru, при отсутствии данных — fallback-генератор. */
export async function fetchCalendar(year: number): Promise<CalendarData> {
  const apiData = await isdayoffFetch(year);
  if (apiData) return apiData;
  return generateFallbackCalendar(year);
}

/** Проверяет, является ли дата выходным или праздником (по данным API). */
export function isDayOff(date: LocalDate, calendarData: CalendarData): boolean {
  const code = calendarData.get(formatDate(date));
  return code === 1 || code === 8;
}

/** Находит ближайший рабочий день, смещаясь назад от указанной даты. */
export function findPreviousWorkday(
  date: LocalDate,
  calendarData: CalendarData,
): LocalDate {
  let result = date;

  while (isDayOff(result, calendarData)) {
    result = result.subtract({ days: 1 });
  }

  return result;
}

/** Отсчитывает N рабочих дней назад от указанной даты. */
export function countWorkdaysBack(
  n: number,
  fromDate: LocalDate,
  calendarData: CalendarData,
): LocalDate {
  let result = fromDate;
  let counted = 0;
  while (counted < n) {
    result = result.subtract({ days: 1 });
    if (!isDayOff(result, calendarData)) {
      counted++;
    }
  }
  return result;
}

/** Подсчитывает количество рабочих дней в диапазоне дат (включительно). */
export function countWorkdays(
  start: LocalDate,
  end: LocalDate,
  calendarData: CalendarData,
): number {
  let count = 0;
  let current = start;

  while (Temporal.PlainDate.compare(current, end) <= 0) {
    if (!isDayOff(current, calendarData)) {
      count++;
    }
    current = current.add({ days: 1 });
  }

  return count;
}

/** Проверяет, является ли дата официальным нерабочим праздничным днём по ст. 112 ТК РФ. */
export function isOfficialHoliday(
  date: LocalDate,
  calendarData: CalendarData,
): boolean {
  const code = calendarData.get(formatDate(date));
  return code === 8;
}

/** Вычисляет массив дат отпуска: N календарных дней от startDate, исключая официальные праздники. */
export function computeVacationDates(
  startDate: LocalDate,
  calendarDays: number,
  calendarData: CalendarData,
): LocalDate[] {
  if (calendarDays < 1 || calendarDays > 28) {
    throw new Error("Количество дней отпуска должно быть от 1 до 28");
  }

  const result: LocalDate[] = [];
  let current = startDate;

  while (result.length < calendarDays) {
    if (!isOfficialHoliday(current, calendarData)) {
      result.push(current);
    }
    current = current.add({ days: 1 });
  }

  return result;
}

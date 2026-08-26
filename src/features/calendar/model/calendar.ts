import type { CalendarData } from "@/shared/types";
import type { LocalDate } from "@/shared/types/local-date";
import { localDate as ld } from "@/shared/types/local-date";
import { Temporal } from "@js-temporal/polyfill";
import { localDateToCalendarKey } from "@/shared/lib/utils";
import { getYearHolidays } from "@/shared/lib/yearSettings";
import { generateFallbackCalendar } from "./calendar-fallback";
import { isdayoffFetch } from "./isdayoff-fetch";

/** Результат загрузки календаря с метаданными об источнике. */
export interface FetchCalendarResult {
  data: CalendarData;
  isFallback: boolean;
}

/**
 * Загружает календарь за год: сначала isdayoff.ru, при отсутствии данных
 * или сетевой ошибке — fallback-генератор.
 * Пост-обработка: в режиме «без учёта ковидных дней» код 4 заменяется на 0,
 * затем праздники года (yearSettings) накладываются кодом 8.
 */
export async function fetchCalendar(
  year: number,
  accountForCoronavirus: boolean,
): Promise<FetchCalendarResult> {
  let apiData: CalendarData | null;
  try {
    apiData = await isdayoffFetch(year);
  } catch {
    // Сетевая ошибка / недоступный API – переходим на fallback,
    // иначе год останется без календаря («Загрузка...» вечно).
    apiData = null;
  }
  const data = apiData ?? generateFallbackCalendar(year);

  if (!accountForCoronavirus) {
    for (const [key, code] of data) {
      if (code === 4) data.set(key, 0);
    }
  }

  applyStatutoryHolidays(data, year);

  return { data, isFallback: apiData === null };
}

/** Накладывает праздники года (yearSettings) на календарь: код 8 независимо от кода провайдера. */
function applyStatutoryHolidays(data: CalendarData, year: number): void {
  for (const [month, day] of getYearHolidays(year)) {
    data.set(localDateToCalendarKey(ld(year, month, day)), 8);
  }
}

/** Проверяет, является ли дата выходным или праздником (по данным API). */
export function isDayOff(date: LocalDate, calendarData: CalendarData): boolean {
  const code = calendarData.get(localDateToCalendarKey(date));
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
  const code = calendarData.get(localDateToCalendarKey(date));
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

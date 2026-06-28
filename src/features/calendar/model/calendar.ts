import type { CalendarData } from "@/shared/types";
import type { LocalDate } from "@/shared/types/local-date";
import { localDate as ld } from "@/shared/types/local-date";
import { Temporal } from "@js-temporal/polyfill";

const ISDAYOFF_BASE_URL = "https://isdayoff.ru/api/getdata";

/** Разделяет официальные праздники (код 8) и выходные (код 1) в ответе API. */
const SEPARATE_HOLIDAY_AND_WEEKEND = 1;

/** Форматирует LocalDate в формат YYYYMMDD для API. */
function formatDate(ld: LocalDate): string {
  return ld.toString().replace(/-/g, "");
}

/** Загружает данные производственного календаря за год через API isdayoff.ru. */
export async function fetchCalendar(year: number): Promise<CalendarData> {
  const url = `${ISDAYOFF_BASE_URL}?year=${year}&cc=ru&holiday=${SEPARATE_HOLIDAY_AND_WEEKEND}`;
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Не удалось загрузить календарь за ${year} год`);
  }

  // API возвращает строку из цифр – по одной на каждый день года (365 или 366 символов)
  const raw = await response.text();
  // Оставляем только цифры, убираем разделители и переносы строк
  const digits = raw.replace(/\D/g, "");
  const data = new Map<string, number>();

  for (let i = 0; i < digits.length && i < 366; i++) {
    const date = ld(year, 1, 1).add({ days: i });
    const code = parseInt(digits.charAt(i), 10);
    if (!isNaN(code)) {
      data.set(formatDate(date), code);
    }
  }

  return data;
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

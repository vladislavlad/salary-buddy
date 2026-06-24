import type { CalendarData } from '@/types';

const ISDAYOFF_BASE_URL = 'https://isdayoff.ru/api/getdata';

/** Разделяет официальные праздники (код 8) и выходные (код 1) в ответе API. */
const SEPARATE_HOLIDAY_AND_WEEKEND = 1;

/**
 * Форматирует дату в формат YYYYMMDD для API.
 */
function formatDate(date: Date): string {
  const year = String(date.getFullYear()).padStart(4, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}${month}${day}`;
}

/**
 * Загружает данные производственного календаря за год через API isdayoff.ru.
 * Возвращает Map<YYYYMMDD, code>, где code: 0=рабочий, 1=нерабочий, 2=сокращённый, 8=праздник.
 */
export async function fetchCalendar(year: number): Promise<CalendarData> {
  const url = `${ISDAYOFF_BASE_URL}?year=${year}&cc=ru&holiday=${SEPARATE_HOLIDAY_AND_WEEKEND}`;
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Не удалось загрузить календарь за ${year} год`);
  }

  // API возвращает строку из цифр — по одной на каждый день года (365 или 366 символов)
  const raw = await response.text();
  // Оставляем только цифры, убираем разделители и переносы строк
  const digits = raw.replace(/\D/g, '');
  const data = new Map<string, number>();

  const startDate = new Date(year, 0, 1);
  for (let i = 0; i < digits.length && i < 366; i++) {
    const date = new Date(startDate);
    date.setDate(date.getDate() + i);
    const code = parseInt(digits.charAt(i), 10);
    if (!isNaN(code)) {
      data.set(formatDate(date), code);
    }
  }

  return data;
}

/**
 * Проверяет, является ли дата выходным или праздником (по данным API).
 */
export function isDayOff(date: Date, calendarData: CalendarData): boolean {
  const code = calendarData.get(formatDate(date));
  return code === 1 || code === 8;
}

/**
 * Находит ближайший рабочий день, смещаясь назад от указанной даты.
 */
export function findPreviousWorkday(date: Date, calendarData: CalendarData): Date {
  const result = new Date(date);

  while (isDayOff(result, calendarData)) {
    result.setDate(result.getDate() - 1);
  }

  return result;
}

/**
 * Отсчитывает N рабочих дней назад от указанной даты.
 */
export function countWorkdaysBack(n: number, fromDate: Date, calendarData: CalendarData): Date {
  const result = new Date(fromDate);
  let counted = 0;
  while (counted < n) {
    result.setDate(result.getDate() - 1);
    if (!isDayOff(result, calendarData)) {
      counted++;
    }
  }
  return result;
}

/**
 * Подсчитывает количество рабочих дней в диапазоне дат (включительно).
 */
export function countWorkdays(start: Date, end: Date, calendarData: CalendarData): number {
  let count = 0;
  const current = new Date(start);

  while (current <= end) {
    if (!isDayOff(current, calendarData)) {
      count++;
    }
    current.setDate(current.getDate() + 1);
  }

  return count;
}

/**
 * Проверяет, является ли дата официальным нерабочим праздничным днём по ст. 112 ТК РФ.
 * С holiday=1 API возвращает код 8 для статутных праздников (независимо от дня недели).
 */
export function isOfficialHoliday(date: Date, calendarData: CalendarData): boolean {
  const code = calendarData.get(formatDate(date));
  return code === 8;
}

/**
 * Вычисляет массив дат отпуска: N календарных дней от startDate, исключая официальные праздники.
 * По ТК РФ отпуск автоматически продлевается на количество праздников внутри него.
 */
export function computeVacationDates(
  startDate: Date,
  calendarDays: number,
  calendarData: CalendarData
): Date[] {
  const result: Date[] = [];
  const current = new Date(startDate);

  while (result.length < calendarDays) {
    if (!isOfficialHoliday(current, calendarData)) {
      result.push(new Date(current));
    }
    current.setDate(current.getDate() + 1);
  }

  return result;
}

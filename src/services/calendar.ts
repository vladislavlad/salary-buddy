import type { CalendarData } from '@/types';

const BASE_URL = 'https://isdayoff.ru/api/getdata';

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
  const url = `${BASE_URL}?year=${year}&cc=ru`;
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
 * Проверяет, является ли дата выходным или праздником.
 * Суббота/воскресенье считаются выходными автоматически.
 */
export function isDayOff(date: Date, calendarData: CalendarData): boolean {
  const dayOfWeek = date.getDay();
  if (dayOfWeek === 0 || dayOfWeek === 6) return true;

  const code = calendarData.get(formatDate(date));
  // 1 — нерабочий день, 8 — праздничный день
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

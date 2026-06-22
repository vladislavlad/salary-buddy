import type { CalendarData } from '@/types';

const CALENDAR_URL = 'https://raw.githubusercontent.com/isdayoff/calendars/main/db/{year}/ru{year}.json';

/**
 * Загружает данные производственного календаря для указанного года.
 */
export async function fetchCalendar(year: number): Promise<CalendarData> {
  const url = CALENDAR_URL.replace('{year}', String(year));
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Не удалось загрузить календарь за ${year} год`);
  }

  return response.json();
}

/**
 * Проверяет, является ли дата выходным или праздником.
 */
export function isDayOff(date: Date, calendarData: CalendarData): boolean {
  const dayOfWeek = date.getDay();
  if (dayOfWeek === 0 || dayOfWeek === 6) return true;

  const mmdd = formatDateMMDD(date);
  return calendarData.dayoff.includes(mmdd) || calendarData.holiday.includes(mmdd);
}

/**
 * Находит ближайший рабочий день, смещаясь назад от указанной даты.
 */
export function findPreviousWorkday(date: Date, calendarData: CalendarData): Date {
  let current = new Date(date);

  while (isDayOff(current, calendarData)) {
    current.setDate(current.getDate() - 1);
  }

  return current;
}

/**
 * Форматирует дату в формат MMDD для сравнения с данными API.
 */
function formatDateMMDD(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${month}${day}`;
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

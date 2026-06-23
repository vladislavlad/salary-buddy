import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { format } from 'date-fns';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const WEEKDAY_NAMES = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];

export const DATE_KEY_FMT = 'yyyy-MM-dd';

export function dateToKey(date: Date): string {
  return format(date, DATE_KEY_FMT);
}

export const MIN_DISPLAY_YEAR = 2024;
export const MAX_DISPLAY_YEAR = 2026;

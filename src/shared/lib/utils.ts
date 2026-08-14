import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import type { LocalDate } from "@/shared/types/local-date";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const WEEKDAY_NAMES = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];

/** Форматирует LocalDate как "YYYY-MM-DD". */
export function dateToKey(date: LocalDate): string {
  return date.toString();
}

/** Форматирует LocalDate как "YYYYMMDD" (ключ CalendarData). */
export function localDateToCalendarKey(ld: LocalDate): string {
  return ld.toString().replace(/-/g, "");
}

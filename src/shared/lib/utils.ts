import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import type { LocalDate } from "@/shared/types/local-date";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const WEEKDAY_NAMES = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];

/** Форматирует LocalDate как "YYYY-MM-DD" (совпадает с CalendarData key). */
export function dateToKey(date: LocalDate): string {
  return date.toString();
}

export const MIN_DISPLAY_YEAR = 2024;
export const MAX_DISPLAY_YEAR = 2026;

import type { LocalDate } from "@/shared/types/local-date";

export function generatePaymentId(
  date: LocalDate,
  counter: Map<string, number>,
): string {
  const key = `${date.year}:${String(date.month).padStart(2, "0")}:${String(date.day).padStart(2, "0")}`;
  const inc = counter.get(key) ?? 0;
  counter.set(key, inc + 1);
  return `pay:${key}:${inc}`;
}

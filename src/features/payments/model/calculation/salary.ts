import type { SalaryChange } from "@/shared/types";
import type { LocalDate } from "@/shared/types/local-date";
import { Temporal } from "@js-temporal/polyfill";
import { getEffectiveValueForDate } from "./effectiveValue";

export function sortSalaryChanges(
  changes: SalaryChange[],
): readonly SalaryChange[] {
  return [...changes].sort((a, b) =>
    Temporal.PlainDate.compare(a.effectiveDate, b.effectiveDate),
  );
}

export function getSalaryForDate(
  date: LocalDate,
  sortedChanges: readonly SalaryChange[],
): number {
  return getEffectiveValueForDate(date, sortedChanges, (c) => c.amount);
}

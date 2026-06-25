import type { SalaryChange } from "@/shared/types";
import type { LocalDate } from "@/shared/types/local-date";
import { Temporal } from "@js-temporal/polyfill";

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
  let result = 0;
  for (const change of sortedChanges) {
    if (Temporal.PlainDate.compare(change.effectiveDate, date) <= 0) {
      result = change.amount;
    } else {
      break;
    }
  }
  return result;
}

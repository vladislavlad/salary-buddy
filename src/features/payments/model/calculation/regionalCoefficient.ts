import type { RegionalCoefficientChange } from "@/shared/types";
import type { LocalDate } from "@/shared/types/local-date";
import { Temporal } from "@js-temporal/polyfill";

export function sortRegionalCoefficientChanges(
  changes: RegionalCoefficientChange[],
): readonly RegionalCoefficientChange[] {
  return [...changes].sort((a, b) =>
    Temporal.PlainDate.compare(a.effectiveDate, b.effectiveDate),
  );
}

export function getCoefficientForDate(
  date: LocalDate,
  sortedChanges: readonly RegionalCoefficientChange[],
): number {
  let result = 0;
  for (const change of sortedChanges) {
    if (Temporal.PlainDate.compare(change.effectiveDate, date) <= 0) {
      result = change.percent;
    } else {
      break;
    }
  }
  return result;
}

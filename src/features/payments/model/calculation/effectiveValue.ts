import type { LocalDate } from "@/shared/types/local-date";
import { Temporal } from "@js-temporal/polyfill";

/**
 * Значение последнего изменения, действующего на дату (включительно).
 * `sortedChanges` обязан быть отсортирован по effectiveDate по возрастанию.
 */
export function getEffectiveValueForDate<T extends { effectiveDate: LocalDate }>(
  date: LocalDate,
  sortedChanges: readonly T[],
  pick: (change: T) => number,
): number {
  let result = 0;
  for (const change of sortedChanges) {
    if (Temporal.PlainDate.compare(change.effectiveDate, date) <= 0) {
      result = pick(change);
    } else {
      break;
    }
  }
  return result;
}

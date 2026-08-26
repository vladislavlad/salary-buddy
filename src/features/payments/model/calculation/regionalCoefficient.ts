import type { RegionalCoefficientChange } from "@/shared/types";
import type { LocalDate } from "@/shared/types/local-date";
import { Temporal } from "@js-temporal/polyfill";
import { getEffectiveValueForDate } from "./effectiveValue";

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
  return getEffectiveValueForDate(date, sortedChanges, (c) => c.percent);
}

// Часть gross, относящаяся к районному коэффициенту: gross × pct / (100 + pct).
export function rcPartOfGrossKop(grossKop: number, percent: number): number {
  if (percent <= 0 || grossKop <= 0) return 0;
  return Math.round((grossKop * percent) / (100 + percent));
}

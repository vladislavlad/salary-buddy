import type { CalendarData, RegionalCoefficientChange, SurchargeChange } from "@/shared/types";
import type { LocalDate } from "@/shared/types/local-date";
import { Temporal } from "@js-temporal/polyfill";
import { dateToKey } from "@/shared/lib/utils";
import { divideRound } from "@/shared/lib/money";
import { getWorkdaysInRange } from "./period";
import { getCoefficientForDate } from "./regionalCoefficient";
import { getEffectiveValueForDate } from "./effectiveValue";

export function sortSurchargeChanges(
  changes: SurchargeChange[],
): readonly SurchargeChange[] {
  return [...changes].sort((a, b) =>
    Temporal.PlainDate.compare(a.effectiveDate, b.effectiveDate),
  );
}

export function getSurchargeForDate(
  date: LocalDate,
  sortedChanges: readonly SurchargeChange[],
): number {
  return getEffectiveValueForDate(date, sortedChanges, (c) => c.amount);
}

export function calculatePeriodSurcharge(
  year: number,
  month: number,
  startDay: number,
  endDay: number,
  absenceDaysSet: Set<string>,
  totalWorkdaysInMonth: number,
  calendarData: CalendarData,
  sortedSurchargeChanges: readonly SurchargeChange[],
  sortedCoefficients?: readonly RegionalCoefficientChange[],
): number {
  const workdays = getWorkdaysInRange(
    year,
    month,
    startDay,
    endDay,
    calendarData,
  );
  let surchargeKop = 0;

  for (const day of workdays) {
    if (absenceDaysSet.has(dateToKey(day))) continue;

    let surchargeAmountKop = getSurchargeForDate(day, sortedSurchargeChanges);
    if (sortedCoefficients && sortedCoefficients.length > 0) {
      const pct = getCoefficientForDate(day, sortedCoefficients);
      if (pct > 0) {
        surchargeAmountKop = Math.round(surchargeAmountKop * (1 + pct / 100));
      }
    }
    surchargeKop += divideRound(surchargeAmountKop, totalWorkdaysInMonth);
  }

  return surchargeKop;
}

import type { CalendarData, SurchargeChange } from "@/shared/types";
import type { LocalDate } from "@/shared/types/local-date";
import { Temporal } from "@js-temporal/polyfill";
import { dateToKey } from "@/shared/lib/utils";
import { divideRound } from "@/shared/lib/money";
import { getWorkdaysInRange } from "./period";

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

export function calculatePeriodSurcharge(
  year: number,
  month: number,
  startDay: number,
  endDay: number,
  vacationDaysSet: Set<string>,
  totalWorkdaysInMonth: number,
  calendarData: CalendarData,
  sortedSurchargeChanges: readonly SurchargeChange[],
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
    if (vacationDaysSet.has(dateToKey(day))) continue;

    const surchargeAmountKop = getSurchargeForDate(day, sortedSurchargeChanges);
    surchargeKop += divideRound(surchargeAmountKop, totalWorkdaysInMonth);
  }

  return surchargeKop;
}

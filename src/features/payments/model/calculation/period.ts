import type { CalendarData, SalaryChange } from "@/shared/types";
import type { LocalDate } from "@/shared/types/local-date";
import { localDate as ld } from "@/shared/types/local-date";
import { isDayOff } from "@/features/calendar/model/calendar";
import { dateToKey } from "@/shared/lib/utils";
import { divideRound } from "@/shared/lib/money";
import { getSalaryForDate } from "./salary";

export function getWorkdaysInRange(
  year: number,
  month: number,
  startDay: number,
  endDay: number,
  calendarData: CalendarData,
): LocalDate[] {
  const result: LocalDate[] = [];
  for (let d = startDay; d <= endDay; d++) {
    const date = ld(year, month, d);
    if (!isDayOff(date, calendarData)) {
      result.push(date);
    }
  }
  return result;
}

export function calculatePeriodGross(
  year: number,
  month: number,
  startDay: number,
  endDay: number,
  absenceDaysSet: Set<string>,
  totalWorkdaysInMonth: number,
  calendarData: CalendarData,
  sortedChanges: readonly SalaryChange[],
): number {
  const workdays = getWorkdaysInRange(
    year,
    month,
    startDay,
    endDay,
    calendarData,
  );
  let grossKop = 0;

  for (const day of workdays) {
    if (absenceDaysSet.has(dateToKey(day))) continue;

    const salaryKop = getSalaryForDate(day, sortedChanges);
    if (salaryKop <= 0) continue;

    grossKop += divideRound(salaryKop, totalWorkdaysInMonth);
  }

  return grossKop;
}

export function calculateByWorkedDays(
  advanceGrossKop: number,
  salaryGrossKop: number,
): { advance: number; salary: number } {
  return {
    advance: Math.max(0, advanceGrossKop),
    salary: Math.max(0, salaryGrossKop),
  };
}

export function calculateFiftyFifty(monthGrossKop: number): {
  advance: number;
  salary: number;
} {
  const half = divideRound(monthGrossKop, 2);
  return {
    advance: half,
    salary: monthGrossKop - half,
  };
}

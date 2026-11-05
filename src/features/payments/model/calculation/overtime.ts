import { Temporal } from "@js-temporal/polyfill";
import { countWorkdays } from "@/features/calendar/model/calendar";
import type { Overtime } from "@/features/overtime/model/overtime";
import { getCoefficientForDate } from "./regionalCoefficient";
import { getSalaryForDate } from "./salary";
import type { BuildSalaryParams, RawEvent } from "./types";

const HOURS_PER_WORKDAY = 8;

export function buildOvertimeEvents(
  overtime: readonly Overtime[],
  salaryEvents: readonly RawEvent[],
  calendarsByYear: BuildSalaryParams["calendarsByYear"],
  sortedChanges: BuildSalaryParams["sortedChanges"],
  sortedCoefficients: NonNullable<
    BuildSalaryParams["sortedRegionalCoefficientChanges"]
  >,
): RawEvent[] {
  if (overtime.length === 0) return [];

  const payouts = salaryEvents
    .filter(({ type }) => type === "advance" || type === "salary")
    .sort((a, b) => Temporal.PlainDate.compare(a.date, b.date));

  const events: RawEvent[] = [];
  for (const entry of overtime) {
    const calendar = calendarsByYear.get(entry.date.year);
    const salaryKop = getSalaryForDate(entry.date, sortedChanges);
    if (!calendar || salaryKop <= 0) continue;

    const payout = payouts.find(
      ({ date }) => Temporal.PlainDate.compare(date, entry.date) >= 0,
    );
    if (!payout) continue;

    const monthStart = entry.date.with({ day: 1 });
    const workdays = countWorkdays(
      monthStart,
      monthStart.with({ day: monthStart.daysInMonth }),
      calendar,
    );
    if (workdays === 0) continue;

    const baseKop =
      (salaryKop * entry.hours * entry.multiplier) /
      (workdays * HOURS_PER_WORKDAY);
    const percent = getCoefficientForDate(entry.date, sortedCoefficients);
    const grossKop = Math.round(baseKop * (1 + percent / 100));
    if (grossKop === 0) continue;

    events.push({
      sourceId: entry.id,
      type: "overtime",
      date: payout.date,
      grossKop,
      salaryAmountKop: salaryKop,
      ...(percent > 0
        ? {
            regionalCoefficientPercent: percent,
            rcKop: grossKop - Math.round(baseKop),
          }
        : {}),
      accrualDate: monthStart,
    });
  }

  return events;
}

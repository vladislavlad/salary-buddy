import type { CalendarData, Vacation } from "@/shared/types";
import type { LocalDate } from "@/shared/types/local-date";
import { localDate as ld } from "@/shared/types/local-date";
import { Temporal } from "@js-temporal/polyfill";
import { findPreviousWorkday } from "@/features/calendar/model/calendar";
import { dateToKey } from "@/shared/lib/utils";
import { AVG_MONTH_DAYS } from "./types";

/**
 * Доход для среднего заработка учитывается по МЕСЯЦУ НАЧИСЛЕНИЯ (за который
 * заработан), а не по дате фактической выплаты. Например, зарплата за февраль,
 * выплаченная в начале марта, относится к февралю.
 */
export interface IncomeRecord {
  type: "advance" | "salary" | "bonus" | "surcharge";
  /** Первый день месяца начисления — по нему определяется расчётный период. */
  accrualDate: LocalDate;
  grossKop: number;
  factKop?: number;
}

export function getIncomeForPeriod(
  fromDate: LocalDate,
  toDate: LocalDate,
  records: IncomeRecord[],
): number {
  let total = 0;

  for (const r of records) {
    if (
      Temporal.PlainDate.compare(r.accrualDate, fromDate) >= 0 &&
      Temporal.PlainDate.compare(r.accrualDate, toDate) < 0
    ) {
      total += r.factKop ?? r.grossKop;
    }
  }

  return total;
}

export function calculateVacationPayment(
  vacation: Vacation,
  vacations: Vacation[],
  year: number,
  calendarData: CalendarData,
  paymentsForIncome: IncomeRecord[],
): {
  grossKop: number;
  paymentDate: LocalDate;
  originalDate: LocalDate;
} | null {
  if (vacation.type !== "paid") return null;

  const datesInYear = vacation.dates.filter((d) => d.year === year);
  if (datesInYear.length <= 0) return null;

  const vacStartMonth = vacation.startDate.month;
  const vacStartYear = vacation.startDate.year;
  // Расчётный период — 12 календарных месяцев ДО месяца отпуска.
  // Для отпуска в фев 2025 это [фев 2024, фев 2025): месяц отпуска исключён,
  // прошлый год учитывается полностью.
  const periodEnd = ld(vacStartYear, vacStartMonth, 1);
  const periodStart = periodEnd.subtract({ months: 12 });

  // Отпускные за прошлые отпуска НЕ входят в доход (они не попадают в
  // paymentsForIncome), а отпускные дни исключаются из includedDays ниже —
  // поэтому отдельное вычитание отпускных из дохода не требуется.
  const includedIncomeKop = getIncomeForPeriod(
    periodStart,
    periodEnd,
    paymentsForIncome,
  );

  const relevantVacations = vacations.filter((v) => {
    if (v.type !== "paid") return false;
    return v.dates.some(
      (d) =>
        Temporal.PlainDate.compare(d, periodStart) >= 0 &&
        Temporal.PlainDate.compare(d, periodEnd) < 0,
    );
  });

  let includedDays = 0;
  for (let m = 0; m < 12; m++) {
    const monthNum = (vacStartMonth - 13 + m) % 12;
    const adjustedMonth = monthNum <= 0 ? monthNum + 12 : monthNum;
    let adjustedYear = vacStartYear;
    if (adjustedMonth >= vacStartMonth) {
      adjustedYear -= 1;
    }
    const monthDate = ld(adjustedYear, adjustedMonth, 1);
    const calDaysInMonth = monthDate.daysInMonth;

    const hasVacationInMonth = relevantVacations.some((v) =>
      v.dates.some(
        (d) => d.year === monthDate.year && d.month === monthDate.month,
      ),
    );

    if (!hasVacationInMonth) {
      includedDays += AVG_MONTH_DAYS;
    } else {
      const vacationDayKeys = new Set<string>();
      for (const v of relevantVacations) {
        for (const d of v.dates) {
          if (d.year === monthDate.year && d.month === monthDate.month) {
            vacationDayKeys.add(dateToKey(d));
          }
        }
      }

      let includedCalDays = 0;
      for (let d = 1; d <= calDaysInMonth; d++) {
        const dayDate = ld(monthDate.year, monthDate.month, d);
        if (!vacationDayKeys.has(dateToKey(dayDate))) {
          includedCalDays++;
        }
      }

      includedDays += (AVG_MONTH_DAYS / calDaysInMonth) * includedCalDays;
    }
  }

  if (includedDays <= 0 || includedIncomeKop <= 0) {
    return null;
  }

  const grossKop = Math.round(
    (includedIncomeKop / includedDays) * datesInYear.length,
  );

  if (grossKop <= 0) {
    return null;
  }

  const firstDateInYear = datesInYear[0]!;
  const paymentDateRaw = firstDateInYear.subtract({ days: 3 });
  const adjustedPaymentDate = findPreviousWorkday(paymentDateRaw, calendarData);

  return {
    grossKop,
    paymentDate: adjustedPaymentDate,
    originalDate: paymentDateRaw,
  };
}

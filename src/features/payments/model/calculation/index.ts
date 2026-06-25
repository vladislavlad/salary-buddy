import type { Payment } from "@/shared/types";
import type { LocalDate } from "@/shared/types/local-date";
import { localDate as ld } from "@/shared/types/local-date";
import { Temporal } from "@js-temporal/polyfill";
import {
  MIN_DISPLAY_YEAR,
  MAX_DISPLAY_YEAR,
  dateToKey,
} from "@/shared/lib/utils";
import {
  findPreviousWorkday,
  countWorkdays,
  countWorkdaysBack,
} from "@/features/calendar/model/calendar";
import { calculateNdflForPayment } from "../ndfl";
import type { CalculateAllInput, RawEvent } from "./types";
import { sortSalaryChanges, getSalaryForDate } from "./salary";
import { sortSurchargeChanges, calculatePeriodSurcharge } from "./surcharge";
import {
  calculatePeriodGross,
  calculateByWorkedDays,
  calculateFiftyFifty,
} from "./period";
import { calculateVacationPayment, type IncomeRecord } from "./vacation";
import { generatePaymentId } from "./paymentId";

export type { CalculateAllInput, RawEvent } from "./types";
export { grossFromNet } from "./netGross";

export function calculateAll(input: CalculateAllInput): Payment[] {
  const {
    settings,
    bonuses,
    surcharges,
    vacations,
    calendarsByYear,
    existingPayments = [],
    recalcFrom,
  } = input;

  const sortedChanges = sortSalaryChanges(settings.salaryChanges);

  if (sortedChanges.length === 0) {
    return [];
  }

  const sortedSurchargeChanges = sortSurchargeChanges(surcharges ?? []);

  const firstChangeYear = sortedChanges[0]!.effectiveDate.year;
  const lastChangeYear =
    sortedChanges[sortedChanges.length - 1]!.effectiveDate.year;
  const minYear = Math.min(firstChangeYear, MIN_DISPLAY_YEAR);
  const maxYear = Math.max(lastChangeYear, MAX_DISPLAY_YEAR);

  const events: RawEvent[] = [];

  for (let year = minYear; year <= maxYear; year++) {
    const calendarData = calendarsByYear.get(year) ?? null;
    if (!calendarData) continue;

    const startMonth =
      sortedChanges[0]!.effectiveDate.year === year
        ? sortedChanges[0]!.effectiveDate.month
        : 1;

    for (let month = startMonth; month <= 12; month++) {
      const totalWorkdaysInMonth = countWorkdays(
        ld(year, month, 1),
        ld(year, month, ld(year, month, 1).daysInMonth),
        calendarData,
      );

      const vacationDaysSet = new Set<string>();
      for (const v of vacations) {
        for (const d of v.dates) {
          if (d.year === year && d.month === month) {
            vacationDaysSet.add(dateToKey(d));
          }
        }
      }

      const lastDayOfMonth = ld(year, month, 1).daysInMonth;

      const advancePeriodGrossKop = calculatePeriodGross(
        year,
        month,
        1,
        Math.min(15, lastDayOfMonth),
        vacationDaysSet,
        totalWorkdaysInMonth,
        calendarData,
        sortedChanges,
      );

      const salaryPeriodGrossKop = calculatePeriodGross(
        year,
        month,
        16,
        lastDayOfMonth,
        vacationDaysSet,
        totalWorkdaysInMonth,
        calendarData,
        sortedChanges,
      );

      let advanceGrossKop: number;
      let salaryGrossKop: number;

      if (settings.distribution === "fifty-fifty") {
        const monthGrossKop = advancePeriodGrossKop + salaryPeriodGrossKop;
        const result = calculateFiftyFifty(monthGrossKop);
        advanceGrossKop = result.advance;
        salaryGrossKop = result.salary;
      } else {
        const result = calculateByWorkedDays(
          advancePeriodGrossKop,
          salaryPeriodGrossKop,
        );
        advanceGrossKop = result.advance;
        salaryGrossKop = result.salary;
      }

      const salarySurchargeKop = calculatePeriodSurcharge(
        year,
        month,
        1,
        lastDayOfMonth,
        vacationDaysSet,
        totalWorkdaysInMonth,
        calendarData,
        sortedSurchargeChanges,
      );

      // Определяем даты выплат — advancePaymentDay может быть больше daysInMonth
      const daysInAdvanceMonth = ld(year, month, 1).daysInMonth;
      const advanceDay = Math.min(
        settings.advancePaymentDay,
        daysInAdvanceMonth,
      );
      const advanceDate = ld(year, month, advanceDay);
      const advanceInYear = advanceDate.year === year;
      let adjustedAdvance: LocalDate | null = null;
      if (advanceInYear) {
        adjustedAdvance = findPreviousWorkday(advanceDate, calendarData);
      }

      // В декабре — зарплата за 1 рабочий день до последнего рабочего дня месяца
      let salaryDate: LocalDate;
      if (month === 12) {
        const monthEnd = ld(year, 12, ld(year, 12, 1).daysInMonth);
        const lastWorkday = findPreviousWorkday(monthEnd, calendarData);
        salaryDate = countWorkdaysBack(1, lastWorkday, calendarData);
      } else {
        const nextMonthDays = ld(year, month + 1, 1).daysInMonth;
        const salaryDay = Math.min(settings.salaryPaymentDay, nextMonthDays);
        salaryDate = ld(year, month + 1, salaryDay);
      }
      const salaryInYear = salaryDate.year === year;
      let adjustedSalary: LocalDate | null = null;
      if (salaryInYear) {
        adjustedSalary = findPreviousWorkday(salaryDate, calendarData);
      }

      if (!advanceInYear && !salaryInYear) continue;

      if (!advanceInYear && salaryInYear) {
        salaryGrossKop += advanceGrossKop;
      }

      const monthSalaryKop = getSalaryForDate(
        ld(
          year,
          month,
          15 > ld(year, month, 1).daysInMonth
            ? ld(year, month, 1).daysInMonth
            : 15,
        ),
        sortedChanges,
      );

      // Месяц начисления — рабочий месяц (year, month), независимо от того,
      // в каком месяце фактически выплачены аванс/зарплата.
      const accrualDate = ld(year, month, 1);

      if (adjustedAdvance) {
        events.push({
          sourceId: `sal:${year}:${String(month).padStart(2, "0")}:a`,
          date: adjustedAdvance,
          originalDate: advanceDate,
          type: "advance",
          grossKop: advanceGrossKop,
          salaryAmountKop: monthSalaryKop,
          month,
          accrualDate,
        });
      }

      if (adjustedSalary) {
        events.push({
          sourceId: `sal:${year}:${String(month).padStart(2, "0")}:b`,
          date: adjustedSalary,
          originalDate: salaryDate,
          type: "salary",
          grossKop: salaryGrossKop,
          salaryAmountKop: monthSalaryKop,
          month,
          accrualDate,
        });

        if (salarySurchargeKop > 0) {
          events.push({
            sourceId: `sur:${year}:${String(month).padStart(2, "0")}`,
            date: adjustedSalary,
            type: "surcharge",
            grossKop: salarySurchargeKop,
            salaryAmountKop: 0,
            month,
            accrualDate,
          });
        }
      }
    }

    // Добавляем премии за этот год
    for (const b of bonuses) {
      if (b.date.year !== year) continue;
      const bonusDate = b.date;
      const salaryOnDateKop = getSalaryForDate(bonusDate, sortedChanges);
      if (b.type === "salaries" && salaryOnDateKop <= 0) continue;

      const grossKop =
        b.type === "salaries" ? b.amount * salaryOnDateKop : b.amount;
      events.push({
        sourceId: b.id,
        date: bonusDate,
        type: "bonus",
        grossKop,
        salaryAmountKop: b.type === "salaries" ? salaryOnDateKop : 0,
        // Премия начисляется в месяце своей даты.
        accrualDate: ld(bonusDate.year, bonusDate.month, 1),
      });
    }
  }

  // Карта фактов из существующих платежей — учитывается в доходе для отпускных и НДФЛ
  const factBySource = new Map<string, number>();
  for (const p of existingPayments) {
    if (p.fact !== undefined) {
      factBySource.set(p.sourceId, p.fact);
    }
  }

  // Итеративный расчёт отпускных — до стабилизации (max 5 итераций)
  const nonVacationEvents = events.filter((e) => e.type !== "vacation");

  for (let iter = 0; iter < 5; iter++) {
    const currentVacationEvents = events.filter((e) => e.type === "vacation");
    const allCurrentEvents = [...nonVacationEvents, ...currentVacationEvents];

    // Доход для отпускных строим ТОЛЬКО из свежесгенерированных событий —
    // конкатенация с existingPayments приводила бы к двойному учёту тех же
    // зарплат/авансов/бонусов/надбавок. Факт переносится через factBySource.
    // Доход учитывается по месяцу начисления (accrualDate), а не по дате выплаты.
    const tempPayments: IncomeRecord[] = allCurrentEvents
      .filter((e) => e.type !== "vacation")
      .map((e) => ({
        type: e.type as IncomeRecord["type"],
        accrualDate: e.accrualDate ?? e.date,
        grossKop: e.grossKop,
        factKop: factBySource.get(e.sourceId),
      }));

    const newVacationEvents: RawEvent[] = [];

    for (const v of vacations) {
      const yearsInRange = new Set<number>();
      for (const d of v.dates) {
        yearsInRange.add(d.year);
      }

      for (const year of yearsInRange) {
        const calendarData = calendarsByYear.get(year);
        if (!calendarData) continue;

        const result = calculateVacationPayment(
          v,
          vacations,
          year,
          calendarData,
          tempPayments,
        );
        if (!result) continue;

        if (
          result.paymentDate.year < minYear ||
          result.paymentDate.year > maxYear
        )
          continue;

        newVacationEvents.push({
          sourceId: v.id,
          date: result.paymentDate,
          originalDate: result.originalDate,
          type: "vacation",
          grossKop: result.grossKop,
          salaryAmountKop: 0,
          month: v.startDate.month,
        });
      }
    }

    let stabilized = true;

    if (currentVacationEvents.length !== newVacationEvents.length) {
      stabilized = false;
    } else {
      const sortedExisting = [...currentVacationEvents].sort((a, b) =>
        a.sourceId.localeCompare(b.sourceId),
      );
      const sortedNew = [...newVacationEvents].sort((a, b) =>
        a.sourceId.localeCompare(b.sourceId),
      );

      for (let i = 0; i < sortedExisting.length; i++) {
        if (
          sortedExisting[i]!.grossKop !== sortedNew[i]!.grossKop ||
          !sortedExisting[i]!.date.equals(sortedNew[i]!.date)
        ) {
          stabilized = false;
          break;
        }
      }
    }

    events.length = 0;
    events.push(...nonVacationEvents, ...newVacationEvents);

    if (stabilized) break;
  }

  // Если есть recalcFrom — сохраняем платежи до этой даты из existingPayments
  let preservedPreRecalc: Payment[] = [];
  let initialAccumulatedIncomeKop = 0;
  let startYear = minYear - 1;

  if (recalcFrom && existingPayments.length > 0) {
    preservedPreRecalc = existingPayments.filter(
      (p) => Temporal.PlainDate.compare(p.date, recalcFrom) < 0,
    );
    if (preservedPreRecalc.length > 0) {
      const lastPre = preservedPreRecalc[preservedPreRecalc.length - 1]!;
      initialAccumulatedIncomeKop = lastPre.yearToDateGross;
      startYear = lastPre.date.year;
    }
  }

  events.sort((a, b) => Temporal.PlainDate.compare(a.date, b.date));

  const recalculatedPayments: Payment[] = [];
  let accumulatedIncomeKop = initialAccumulatedIncomeKop;
  let currentYear = startYear;
  const idCounter = new Map<string, number>();

  for (const event of events) {
    const eventYear = event.date.year;

    if (recalcFrom && Temporal.PlainDate.compare(event.date, recalcFrom) < 0) {
      continue;
    }

    if (eventYear !== currentYear) {
      accumulatedIncomeKop = 0;
      currentYear = eventYear;
    }

    const effectiveGrossKop =
      factBySource.get(event.sourceId) ?? event.grossKop;

    if (event.type === "surcharge") {
      recalculatedPayments.push({
        id: generatePaymentId(event.date, idCounter),
        sourceId: event.sourceId,
        date: event.date,
        type: "surcharge",
        salaryAmount: 0,
        gross: event.grossKop,
        ndfls: [],
        ndfl: 0,
        net: effectiveGrossKop,
        yearToDateGross: accumulatedIncomeKop,
        month: event.month,
      });
      continue;
    }

    const ndflResult = calculateNdflForPayment(
      effectiveGrossKop,
      accumulatedIncomeKop,
      currentYear,
    );

    const payment: Payment = {
      id: generatePaymentId(event.date, idCounter),
      sourceId: event.sourceId,
      date: event.date,
      ...(event.originalDate ? { originalDate: event.originalDate } : {}),
      type: event.type,
      salaryAmount: event.salaryAmountKop,
      gross: event.grossKop,
      ndfls: ndflResult.breakdown,
      ndfl: ndflResult.ndfl,
      net: effectiveGrossKop - ndflResult.ndfl,
      yearToDateGross: ndflResult.newAccumulatedIncome,
      ...(event.month !== undefined ? { month: event.month } : {}),
    };

    recalculatedPayments.push(payment);
    accumulatedIncomeKop = ndflResult.newAccumulatedIncome;
  }

  return [...preservedPreRecalc, ...recalculatedPayments];
}

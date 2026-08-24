import type {
  CalendarData,
  RegionalCoefficientChange,
  SickLeave,
  SickLeaveSettings,
} from "@/shared/types";
import type { LocalDate } from "@/shared/types/local-date";
import { localDate as ld } from "@/shared/types/local-date";
import { findPreviousWorkday, isDayOff } from "@/features/calendar/model/calendar";
import type { RawEvent, MonthPaymentDates } from "./types";
import type { IncomeRecord } from "./vacation";
import { getCoefficientForDate } from "./regionalCoefficient";
import { getSickLeaveLimits } from "./sickLeaveLimits";
import { getWorkInjuryMonthlyCapKop } from "@/shared/lib/yearSettings";

// Половина месяца для выплат работодателя: "a" – дни 1-15 (аванс), "b" – дни 16+ (зарплата).
type MonthHalf = "a" | "b";

function monthHalf(d: LocalDate): MonthHalf {
  return d.day <= 15 ? "a" : "b";
}

// Дата выплаты работодателя за день больничного: дни 1-15 платятся в день аванса,
// дни 16+ – в день зарплаты. Если даты выплат за месяц неизвестны (нет в карте) –
// откатываемся к дате выплаты по больничному (рабочий день перед концом периода).
function resolveEmployerPayDate(
  year: number,
  month: number,
  half: MonthHalf,
  fallback: LocalDate,
  paymentDatesByMonth: Map<string, MonthPaymentDates>,
): LocalDate {
  const entry = paymentDatesByMonth.get(
    `${year}-${String(month).padStart(2, "0")}`,
  );
  const target = half === "a" ? entry?.advanceDate : entry?.salaryDate;
  return target ?? fallback;
}

function getExperiencePercent(
  reason: SickLeave["reason"],
  experience: SickLeave["experience"],
): number {
  if (reason === "work-injury" || reason === "child-care-under7") return 100;
  switch (experience) {
    case "under5":
      return 60;
    case "5to8":
      return 80;
    case "8plus":
      return 100;
  }
}

function getIncomeForPeriod(
  fromYear: number,
  toYear: number,
  records: IncomeRecord[],
): number {
  let total = 0;
  for (const r of records) {
    const y = r.accrualDate.year;
    if (y >= fromYear && y < toYear) {
      total += r.factKop ?? r.grossKop;
    }
  }
  return total;
}

// Сумма частей РК в доходе расчётного периода (тот же период, что и getIncomeForPeriod).
function getRcForPeriod(
  fromYear: number,
  toYear: number,
  records: IncomeRecord[],
): number {
  let total = 0;
  for (const r of records) {
    const y = r.accrualDate.year;
    if (y >= fromYear && y < toYear) {
      total += r.rcKop ?? 0;
    }
  }
  return total;
}

function calculateAvgDailyEarnings(
  sickLeave: SickLeave,
  incomeRecords: IncomeRecord[],
  currentSalaryKop: number,
  sortedCoefficients?: readonly RegionalCoefficientChange[],
): { avgDailyEarningsKop: number; usedFallback: boolean; rcShare: number } {
  const slYear = sickLeave.startDate.year;
  const fromYear = slYear - 2;
  const { minAvgDailyEarningsKop, maxAvgDailyEarningsKop } =
    getSickLeaveLimits(slYear);

  const totalIncomeKop = getIncomeForPeriod(fromYear, slYear, incomeRecords);

  // При производственной травме СДЗ определяется без учёта предельной базы (ст. 9 ФЗ-125).
  const hasMaxCap = sickLeave.reason !== "work-injury";

  if (totalIncomeKop > 0) {
    let avgDailyEarningsKop = Math.round(totalIncomeKop / 730);
    if (hasMaxCap) {
      avgDailyEarningsKop = Math.min(maxAvgDailyEarningsKop, avgDailyEarningsKop);
    }
    avgDailyEarningsKop = Math.max(minAvgDailyEarningsKop, avgDailyEarningsKop);
    // Доля РК в доходе расчётного периода – для выделения части РК пособия
    // в отдельную базу НДФЛ (с 2026).
    const totalRcKop = getRcForPeriod(fromYear, slYear, incomeRecords);
    return {
      avgDailyEarningsKop,
      usedFallback: false,
      rcShare: totalRcKop / totalIncomeKop,
    };
  }

  // Fallback: оклад × (1 + РК) × 24 / 730 (аналог МРОТ с учётом РК, ст. 14 ФЗ-255).
  const pct = sortedCoefficients
    ? getCoefficientForDate(sickLeave.startDate, sortedCoefficients)
    : 0;
  const effectiveSalaryKop =
    pct > 0 ? Math.round(currentSalaryKop * (1 + pct / 100)) : currentSalaryKop;
  let avgDailyEarningsKop = Math.round((effectiveSalaryKop * 24) / 730);
  if (hasMaxCap) {
    avgDailyEarningsKop = Math.min(maxAvgDailyEarningsKop, avgDailyEarningsKop);
  }
  avgDailyEarningsKop = Math.max(minAvgDailyEarningsKop, avgDailyEarningsKop);
  return {
    avgDailyEarningsKop,
    usedFallback: true,
    rcShare: pct > 0 ? pct / (100 + pct) : 0,
  };
}

// Ключ для группировки дней по году-месяцу: "YYYY-MM".
type YearMonthKey = string;

export function calculateSickLeavePayments(
  sickLeaves: SickLeave[],
  settings: SickLeaveSettings,
  calendarsByYear: Map<number, CalendarData>,
  incomeRecords: IncomeRecord[],
  currentSalaryKop: number,
  paymentDatesByMonth: Map<string, MonthPaymentDates> = new Map(),
  sortedCoefficients?: readonly RegionalCoefficientChange[],
): RawEvent[] {
  if (sickLeaves.length === 0) return [];

  const events: RawEvent[] = [];

  // Группируем дни по году-месяцу для каждого больничного.
  // Нужна месячная гранулярность для лимита производственной травмы (ст. 9 ФЗ-125).
  const datesByYMMap = new Map<
    string,
    Map<YearMonthKey, LocalDate[]>
  >();
  for (const sl of sickLeaves) {
    const datesByYM = new Map<YearMonthKey, LocalDate[]>();
    for (const d of sl.dates) {
      const key = `${d.year}-${String(d.month).padStart(2, "0")}`;
      if (!datesByYM.has(key)) datesByYM.set(key, []);
      datesByYM.get(key)!.push(d);
    }
    datesByYMMap.set(sl.id, datesByYM);
  }

  // Распределяем лимит доплаты по больничным в порядке добавления.
  // Лимит считается в рабочих днях в году (выходные и праздники не потребляют квоту).
  const remainingTopUpByYear = new Map<number, number>();
  for (const sl of sickLeaves) {
    for (const d of sl.dates) {
      if (!remainingTopUpByYear.has(d.year)) {
        remainingTopUpByYear.set(d.year, settings.topUpDaysLimitPerYear);
      }
    }
  }

  const allocatedTopUp: Map<
    string,
    Map<YearMonthKey, number>
  > = new Map();
  for (const sl of sickLeaves) {
    allocatedTopUp.set(sl.id, new Map());
    const datesByYM = datesByYMMap.get(sl.id)!;

    // Сортируем ключи для последовательного распределения.
    const sortedKeys = [...datesByYM.keys()].sort();
    for (const ymKey of sortedKeys) {
      const dates = datesByYM.get(ymKey)!;
      const year = dates[0]!.year;
      const cal = calendarsByYear.get(year);
      const workdayCount = cal
        ? dates.filter((d) => !isDayOff(d, cal)).length
        : 0;
      const remaining = remainingTopUpByYear.get(year) ?? 0;
      const alloc = Math.min(workdayCount, remaining);
      allocatedTopUp.get(sl.id)!.set(ymKey, alloc);
      remainingTopUpByYear.set(year, remaining - alloc);
    }
  }

  for (const sl of sickLeaves) {
    const { avgDailyEarningsKop, rcShare } = calculateAvgDailyEarnings(
      sl,
      incomeRecords,
      currentSalaryKop,
      sortedCoefficients,
    );

    const experiencePercent = getExperiencePercent(sl.reason, sl.experience);
    const dailyBenefitKop = Math.round(
      (avgDailyEarningsKop * experiencePercent) / 100,
    );

    const datesByYM = datesByYMMap.get(sl.id)!;

    // Сортируем ключи год-месяц для последовательной обработки.
    const sortedYMs = [...datesByYM.keys()].sort();

    // Глобальный индекс дня в больничном (для корректного split employer/SFR).
    let globalDayIdx = 1;
    for (const ymKey of sortedYMs) {
      const datesInChunk = datesByYM.get(ymKey)!;
      const year = datesInChunk[0]!.year;
      const month = datesInChunk[0]!.month;
      const calendarData = calendarsByYear.get(year);
      if (!calendarData) continue;

      const endDate = datesInChunk[datesInChunk.length - 1]!;
      const paymentDate = findPreviousWorkday(endDate, calendarData);

      // Работодатель: пособие за дни 1-3 (только illness). Платится вместе с
      // авансом/зарплатой → разносим по половинам месяца (1-15 → аванс, 16+ → зарплата).
      if (sl.reason === "illness") {
        const employerByHalf = new Map<MonthHalf, number>();
        for (let i = 0; i < datesInChunk.length; i++) {
          if (globalDayIdx + i > 3) break;
          const half = monthHalf(datesInChunk[i]!);
          employerByHalf.set(
            half,
            (employerByHalf.get(half) ?? 0) + dailyBenefitKop,
          );
        }
        for (const [half, grossKop] of employerByHalf) {
          events.push({
            sourceId: `${sl.id}:emp:${ymKey}:${half}`,
            date: resolveEmployerPayDate(
              year,
              month,
              half,
              paymentDate,
              paymentDatesByMonth,
            ),
            type: "sick-leave",
            grossKop,
            salaryAmountKop: 0,
            // Часть РК пособия – пропорционально доле РК в СДЗ (для отдельной базы НДФЛ с 2026).
            rcKop:
              rcShare > 0
                ? Math.round(grossKop * rcShare) || undefined
                : undefined,
          });
        }
      }

      // СФР часть – дни начиная с sfrStartDay.
      const sfrStartDay = sl.reason === "illness" ? 4 : 1;

      let sfrGrossKop = 0;
      for (let i = 0; i < datesInChunk.length; i++) {
        const dayNum = globalDayIdx + i;
        if (dayNum >= sfrStartDay) {
          let dayBenefit = dailyBenefitKop;

          // Первые 10 дней оплачиваются по стажу, с 11-го – 50% от СДЗ (ст. 7 ФЗ-255).
          if (sl.reason === "child-care-7to15" && dayNum > 10) {
            dayBenefit = Math.round(avgDailyEarningsKop * 0.5);
          }

          sfrGrossKop += dayBenefit;
        }
      }

      // Лимит пособия по производственной травме: не более 4× макс. ежемесячной
      // страховой выплаты (ст. 9 ФЗ-125), значение за месяц/год чанка.
      if (sl.reason === "work-injury") {
        const workInjuryCapKop = getWorkInjuryMonthlyCapKop(ld(year, month, 1));
        sfrGrossKop = Math.min(sfrGrossKop, workInjuryCapKop);
      }

      if (sfrGrossKop > 0) {
        events.push({
          sourceId: `${sl.id}:sfr:${ymKey}`,
          date: paymentDate,
          type: "sick-leave-sfr",
          grossKop: sfrGrossKop,
          salaryAmountKop: 0,
        });
      }

      globalDayIdx += datesInChunk.length;

      // Доплата от работодателя – только за рабочие дни. Платится вместе с
      // авансом/зарплатой → разносим по половинам месяца (1-15 → аванс, 16+ → зарплата).
      if (settings.enableTopUp) {
          const topUpDays = allocatedTopUp.get(sl.id)?.get(ymKey) ?? 0;
          if (topUpDays > 0 && dailyBenefitKop > 0) {
            const topUpByHalf = new Map<MonthHalf, number>();
            const topUpRcByHalf = new Map<MonthHalf, number>();

          // Кэшируем рабочие дни по месяцам.
          const monthWorkdaysCache = new Map<string, number>();

          // Берём только рабочие дни из периода больничного (до лимита).
          const workdayDates = calendarData
            ? datesInChunk.filter((d) => !isDayOff(d, calendarData))
            : [];
          for (let i = 0; i < Math.min(topUpDays, workdayDates.length); i++) {
            const dayDate = workdayDates[i]!;

            const cacheKey = `${dayDate.year}-${dayDate.month}`;
            let monthWorkdays = monthWorkdaysCache.get(cacheKey);
            if (monthWorkdays === undefined) {
              const cal = calendarsByYear.get(dayDate.year);
              if (!cal) {
                monthWorkdays = 0;
              } else {
                monthWorkdays = 0;
                for (let d = 1; d <= dayDate.daysInMonth; d++) {
                  const checkDate = ld(dayDate.year, dayDate.month, d);
                  const code = cal.get(checkDate.toString().replace(/-/g, ""));
                  if (code !== 1 && code !== 8) monthWorkdays++;
                }
              }
              monthWorkdaysCache.set(cacheKey, monthWorkdays);
            }

            // Дневной оклад с учётом РК, действующего на дату дня больничного.
            const dayPct = sortedCoefficients
              ? getCoefficientForDate(dayDate, sortedCoefficients)
              : 0;
            const effectiveSalaryKop =
              dayPct > 0
                ? Math.round(currentSalaryKop * (1 + dayPct / 100))
                : currentSalaryKop;
            const dailySalaryKop =
              monthWorkdays > 0
                ? Math.round(effectiveSalaryKop / monthWorkdays)
                : 0;
            const dailySalaryRcKop =
              dayPct > 0
                ? Math.round((dailySalaryKop * dayPct) / (100 + dayPct))
                : 0;
            const topUpPerDay = Math.max(0, dailySalaryKop - dailyBenefitKop);
            // Часть РК доплаты = часть РК дневного оклада за вычетом части РК пособия.
            const benefitRcKop = Math.round(dailyBenefitKop * rcShare);
            const topUpRcPerDay = Math.max(0, dailySalaryRcKop - benefitRcKop);
            const half = monthHalf(dayDate);
            topUpByHalf.set(half, (topUpByHalf.get(half) ?? 0) + topUpPerDay);
            topUpRcByHalf.set(
              half,
              (topUpRcByHalf.get(half) ?? 0) + topUpRcPerDay,
            );
          }

          for (const [half, grossKop] of topUpByHalf) {
            if (grossKop <= 0) continue;
            const rcKop = topUpRcByHalf.get(half) ?? 0;
            events.push({
              sourceId: `${sl.id}:topup:${ymKey}:${half}`,
              date: resolveEmployerPayDate(
                year,
                month,
                half,
                paymentDate,
                paymentDatesByMonth,
              ),
              type: "sick-leave-topup",
              grossKop,
              salaryAmountKop: 0,
              rcKop: rcKop > 0 ? rcKop : undefined,
            });
          }
        }
      }
    }
  }

  return events;
}

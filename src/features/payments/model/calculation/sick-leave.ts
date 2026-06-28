import type { CalendarData, SickLeave, SickLeaveSettings } from "@/shared/types";
import type { LocalDate } from "@/shared/types/local-date";
import { localDate as ld } from "@/shared/types/local-date";
import { findPreviousWorkday, isDayOff } from "@/features/calendar/model/calendar";
import type { RawEvent, MonthPaymentDates } from "./types";
import type { IncomeRecord } from "./vacation";

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

// Лимиты СДЗ 2026 (копейки)
const MAX_AVG_DAILY_EARNINGS_KOP = 682_740; // 6 827,40 ₽/день
const MIN_AVG_DAILY_EARNINGS_KOP = 89_073; // 890,73 ₽/день

// Макс. пособие по производственной травме в месяц: 4 × макс. ежемесячной страховой выплаты (ст. 9 ФЗ-125)
const WORK_INJURY_MONTHLY_CAP_KOP = 50_315_664; // 503 156,64 ₽

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

function calculateAvgDailyEarnings(
  sickLeave: SickLeave,
  incomeRecords: IncomeRecord[],
  currentSalaryKop: number,
): { avgDailyEarningsKop: number; usedFallback: boolean } {
  const slYear = sickLeave.startDate.year;
  const fromYear = slYear - 2;

  const totalIncomeKop = getIncomeForPeriod(fromYear, slYear, incomeRecords);

  // При производственной травме СДЗ определяется без учёта предельной базы (ст. 9 ФЗ-125).
  const hasMaxCap = sickLeave.reason !== "work-injury";

  if (totalIncomeKop > 0) {
    let avgDailyEarningsKop = Math.round(totalIncomeKop / 730);
    if (hasMaxCap) {
      avgDailyEarningsKop = Math.min(MAX_AVG_DAILY_EARNINGS_KOP, avgDailyEarningsKop);
    }
    avgDailyEarningsKop = Math.max(MIN_AVG_DAILY_EARNINGS_KOP, avgDailyEarningsKop);
    return { avgDailyEarningsKop, usedFallback: false };
  }

  // Fallback: оклад × 24 / 730
  let avgDailyEarningsKop = Math.round((currentSalaryKop * 24) / 730);
  if (hasMaxCap) {
    avgDailyEarningsKop = Math.min(MAX_AVG_DAILY_EARNINGS_KOP, avgDailyEarningsKop);
  }
  avgDailyEarningsKop = Math.max(MIN_AVG_DAILY_EARNINGS_KOP, avgDailyEarningsKop);
  return { avgDailyEarningsKop, usedFallback: true };
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
    const { avgDailyEarningsKop } = calculateAvgDailyEarnings(
      sl,
      incomeRecords,
      currentSalaryKop,
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

      // Лимит пособия по производственной травме: не более 4× макс. ежемесячной страховой выплаты (ст. 9 ФЗ-125).
      if (sl.reason === "work-injury") {
        sfrGrossKop = Math.min(sfrGrossKop, WORK_INJURY_MONTHLY_CAP_KOP);
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

            const dailySalaryKop =
              monthWorkdays > 0
                ? Math.round(currentSalaryKop / monthWorkdays)
                : 0;
            const topUpPerDay = Math.max(0, dailySalaryKop - dailyBenefitKop);
            const half = monthHalf(dayDate);
            topUpByHalf.set(half, (topUpByHalf.get(half) ?? 0) + topUpPerDay);
          }

          for (const [half, grossKop] of topUpByHalf) {
            if (grossKop <= 0) continue;
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
            });
          }
        }
      }
    }
  }

  return events;
}

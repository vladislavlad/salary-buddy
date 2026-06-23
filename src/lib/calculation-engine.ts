import { getDaysInMonth, eachDayOfInterval } from 'date-fns';
import type { SalarySettings, Bonus, Payment, YearCalculation, CalendarData, Vacation, VacationSettings, SalaryChange } from '@/types';
import { calculateNdflForPayment } from './ndfl';
import { findPreviousWorkday, countWorkdays, isDayOff, countWorkdaysBack } from '@/services/calendar';
import { dateToKey } from './utils';

/**
 * Обратный расчёт: по сумме «на руки» и накопленному доходу до выплаты
 * находит сумму до НДФЛ. Использует бинарный поиск с верификацией через calculateNdflForPayment.
 */
export function grossFromNet(net: number, priorYtdGross: number, year: number): number {
  // Считаем уже уплаченный налог на момент priorYtdGross
  const priorTaxResult = calculateNdflForPayment(priorYtdGross, 0, 0, year);

  let lo = net;
  let hi = Math.ceil(net / 0.78);

  for (let i = 0; i < 100; i++) {
    const mid = Math.round((lo + hi) / 2);
    const check = calculateNdflForPayment(mid, priorYtdGross, priorTaxResult.newTotalTax, year);
    const midNetRounded = Math.round(mid - check.ndfl);
    if (midNetRounded === net) return mid;
    if (midNetRounded < net) lo = mid + 1;
    else hi = mid - 1;
  }

  // Линейный поиск вокруг лучшего приближения
  for (let g = Math.max(net, lo - 5); g <= hi + 5; g++) {
    const c = calculateNdflForPayment(g, priorYtdGross, priorTaxResult.newTotalTax, year);
    if (Math.round(g - c.ndfl) === net) return g;
  }

  return Math.round(net / 0.87);
}

interface ScheduledEvent {
  id: string; // sal:{year}:{month}:{a|b} или vac:{year}:{seq}
  date: Date;
  originalDate: Date;
  type: 'advance' | 'salary' | 'vacation';
  gross: number;
  salaryAmount: number; // оклад на момент выплаты (0 для отпускных)
  month: number;
}

interface BonusEvent {
  id: string; // bon:{year}:{seq}
  date: Date;
  gross: number;
  salaryAmount: number; // оклад на момент выплаты, 0 для «своя сумма»
}

const AVG_MONTH_DAYS = 29.3;

/**
 * Сортирует оклады по дате действия.
 */
function sortSalaryChanges(changes: SalaryChange[]): readonly SalaryChange[] {
  return [...changes].sort((a, b) => a.effectiveDate.getTime() - b.effectiveDate.getTime());
}

/**
 * Возвращает оклад на указанный месяц (0–11).
 */
function getSalaryForMonth(year: number, month: number, sortedChanges: readonly SalaryChange[]): number {
  const target = new Date(year, month, 1);
  let result = 0;
  for (const change of sortedChanges) {
    if (change.effectiveDate <= target) {
      result = change.amount;
    } else {
      break;
    }
  }
  return result;
}

/**
 * Возвращает оклад на указанную дату.
 */
function getSalaryForDate(date: Date, sortedChanges: readonly SalaryChange[]): number {
  let result = 0;
  for (const change of sortedChanges) {
    if (change.effectiveDate <= date) {
      result = change.amount;
    } else {
      break;
    }
  }
  return result;
}

/**
 * Суммирует фактические оклады по всем месяцам года для расчёта отпускных.
 */
function getAnnualIncomeFromChanges(year: number, sortedChanges: readonly SalaryChange[]): number {
  let total = 0;
  for (let m = 0; m < 12; m++) {
    total += getSalaryForMonth(year, m, sortedChanges);
  }
  return total;
}

/**
 * Чистая функция: рассчитывает выплаты за один год.
 * НДФЛ всегда начинается с нуля для каждого года.
 */
export function calculateYear(
  year: number,
  settings: SalarySettings,
  bonuses: Bonus[],
  vacations: Vacation[],
  vacationSettings: VacationSettings,
  calendarData: CalendarData | null,
  facts?: Record<string, number>
): YearCalculation {
  const sortedChanges = sortSalaryChanges(settings.salaryChanges);

  if (sortedChanges.length === 0) {
    return {
      payments: [],
      vacationDays: new Map(),
    };
  }

  if (!calendarData) {
    // Календарь ещё не загружен — вернём пустой результат.
    // PaymentsProvider вызовет пересчёт после загрузки календаря.
    return {
      payments: [],
      vacationDays: new Map(),
    };
  }

  const payments: Payment[] = [];
  const vacationDaysMap = new Map<string, boolean>();

  // НДФЛ начинается с нуля для каждого года
  let accumulatedIncome = 0;
  let totalTaxPaid = 0;

  // Собираем все дни отпусков для отображения на календаре
  for (const v of vacations) {
    const days = eachDayOfInterval({ start: v.startDate, end: v.endDate });
    for (const d of days) {
      if (d.getFullYear() === year) {
        const key = dateToKey(d);
        vacationDaysMap.set(key, true);
      }
    }
  }

  // Находим первый месяц с окладом — расчёт начинаем с него
  const firstChange = sortedChanges[0];
  if (!firstChange) {
    return { payments: [], vacationDays: new Map() };
  }

  const startMonth = firstChange.effectiveDate.getFullYear() === year
    ? firstChange.effectiveDate.getMonth()
    : 0;

  // Собираем все выплаты зарплаты в хронологическом порядке
  const events: ScheduledEvent[] = [];

  for (let month = startMonth; month < 12; month++) {
    const monthSalary = getSalaryForMonth(year, month, sortedChanges);
    if (monthSalary <= 0) continue;

    const monthStart = new Date(year, month, 1);
    const monthEnd = new Date(year, month + 1, 0);

    // Аванс за месяц M платится на advancePaymentDay месяца M
    const advanceDate = new Date(year, month, settings.advancePaymentDay);
    if (advanceDate.getFullYear() !== year) continue;
    const adjustedAdvance = findPreviousWorkday(advanceDate, calendarData);

    // В декабре — аванс как обычно, зарплата за 1 рабочий день до последнего рабочего дня месяца
    let salaryDate: Date;
    if (month === 11) {
      const lastWorkday = findPreviousWorkday(monthEnd, calendarData);
      salaryDate = countWorkdaysBack(1, lastWorkday, calendarData);
    } else {
      salaryDate = new Date(year, month + 1, settings.salaryPaymentDay);
      if (salaryDate.getFullYear() !== year) continue;
    }
    const adjustedSalary = findPreviousWorkday(salaryDate, calendarData);

    // Находим отпуска, пересекающие текущий месяц
    const monthVacations = vacations.filter((v) => {
      return v.startDate <= monthEnd && v.endDate >= monthStart;
    });

    // Считаем рабочие дни отпуска в первой и второй половине месяца
    let vacationWorkdaysFirstHalf = 0;
    let vacationWorkdaysSecondHalf = 0;

    for (const v of monthVacations) {
      const vacStartInMonth = v.startDate < monthStart ? monthStart : new Date(v.startDate);
      const vacEndInMonth = v.endDate > monthEnd ? monthEnd : new Date(v.endDate);

      const fifteenthDate = new Date(year, month, Math.min(15, getDaysInMonth(new Date(year, month))));
      const firstHalfStart = vacStartInMonth > monthStart ? vacStartInMonth : monthStart;
      const firstHalfEnd = vacEndInMonth < fifteenthDate ? vacEndInMonth : fifteenthDate;

      if (firstHalfEnd >= firstHalfStart) {
        for (const d of eachDayOfInterval({ start: firstHalfStart, end: firstHalfEnd })) {
          if (!isDayOff(d, calendarData)) {
            vacationWorkdaysFirstHalf++;
          }
        }
      }

      const secondHalfStart = new Date(year, month, 16);
      const shStart = vacStartInMonth > secondHalfStart ? vacStartInMonth : secondHalfStart;
      const shEnd = vacEndInMonth < monthEnd ? vacEndInMonth : monthEnd;

      if (shEnd >= shStart) {
        for (const d of eachDayOfInterval({ start: shStart, end: shEnd }) as Date[]) {
          if (!isDayOff(d, calendarData)) {
            vacationWorkdaysSecondHalf++;
          }
        }
      }
    }

    // Рассчитываем суммы в зависимости от режима распределения
    let advanceGross: number;
    let salaryGross: number;

    const totalWorkdaysInMonth = countWorkdays(monthStart, monthEnd, calendarData);
    const fifteenthDate = new Date(year, month, Math.min(15, getDaysInMonth(new Date(year, month))));
    const workdaysFirstHalf = countWorkdays(monthStart, fifteenthDate, calendarData);

    if (settings.distribution === 'fifty-fifty') {
      advanceGross = monthSalary / 2;
      salaryGross = monthSalary / 2;

      if (totalWorkdaysInMonth > 0) {
        const dayRate = monthSalary / totalWorkdaysInMonth;
        let advanceDeduction = vacationWorkdaysFirstHalf * dayRate;
        let salaryDeduction = vacationWorkdaysSecondHalf * dayRate;

        if (advanceGross - advanceDeduction < 0) {
          const excess = advanceDeduction - advanceGross;
          salaryDeduction += excess;
          advanceDeduction = advanceGross;
        }

        advanceGross -= advanceDeduction;
        salaryGross -= salaryDeduction;
        if (salaryGross < 0) salaryGross = 0;
      }
    } else {
      const actualWorkdaysFirstHalf = workdaysFirstHalf - vacationWorkdaysFirstHalf;
      const workdaysSecondHalf = totalWorkdaysInMonth - workdaysFirstHalf;
      const actualWorkdaysSecondHalf = workdaysSecondHalf - vacationWorkdaysSecondHalf;

      if (totalWorkdaysInMonth > 0) {
        advanceGross = monthSalary * (actualWorkdaysFirstHalf / totalWorkdaysInMonth);
        salaryGross = monthSalary * (actualWorkdaysSecondHalf / totalWorkdaysInMonth);
        if (advanceGross < 0) advanceGross = 0;
        if (salaryGross < 0) salaryGross = 0;
      } else {
        advanceGross = monthSalary / 2;
        salaryGross = monthSalary / 2;
      }
    }

    events.push({
      id: `sal:${year}:${String(month + 1).padStart(2, '0')}:a`,
      date: adjustedAdvance,
      originalDate: advanceDate,
      type: 'advance',
      gross: advanceGross,
      salaryAmount: monthSalary,
      month: month + 1,
    });

    events.push({
      id: `sal:${year}:${String(month + 1).padStart(2, '0')}:b`,
      date: adjustedSalary,
      originalDate: salaryDate,
      type: 'salary',
      gross: salaryGross,
      salaryAmount: monthSalary,
      month: month + 1,
    });
  }

  // Сортируем все события по дате
  events.sort((a, b) => a.date.getTime() - b.date.getTime());

  // Добавляем премии (только те, что в рамках года и есть оклад на эту дату)
  const bonusEvents: BonusEvent[] = [];
  for (const b of bonuses) {
    const bonusDate = new Date(b.date);
    if (bonusDate.getFullYear() !== year) continue;
    const salaryOnDate = getSalaryForDate(bonusDate, sortedChanges);
    if (b.type === 'salaries' && salaryOnDate <= 0) continue;
    const gross = b.type === 'salaries' ? b.amount * salaryOnDate : b.amount;
    bonusEvents.push({ id: b.id, date: bonusDate, gross, salaryAmount: b.type === 'salaries' ? salaryOnDate : 0 });
  }

  // Добавляем отпускные (только оплачиваемые отпуска)
  const vacationEvents: ScheduledEvent[] = [];
  for (const v of vacations) {
    if (v.type !== 'paid') continue;

    const vacStartInYear = v.startDate < new Date(year, 0, 1) ? new Date(year, 0, 1) : new Date(v.startDate);
    const vacEndInYear = v.endDate > new Date(year, 11, 31) ? new Date(year, 11, 31) : new Date(v.endDate);

    if (vacStartInYear.getFullYear() !== year && vacEndInYear.getFullYear() !== year) continue;

    const calendarDays = Math.round((vacEndInYear.getTime() - vacStartInYear.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    if (calendarDays <= 0) continue;

    const annualIncome = vacationSettings.annualIncome12m ?? getAnnualIncomeFromChanges(year, sortedChanges);
    const avgDailyEarnings = annualIncome / 12 / AVG_MONTH_DAYS;
    const gross = Math.round(avgDailyEarnings * calendarDays);

    const paymentDateRaw = new Date(vacStartInYear);
    paymentDateRaw.setDate(paymentDateRaw.getDate() - 2);
    const adjustedPaymentDate = findPreviousWorkday(paymentDateRaw, calendarData);

    vacationEvents.push({
      id: v.id,
      date: adjustedPaymentDate,
      originalDate: paymentDateRaw,
      type: 'vacation',
      gross,
      salaryAmount: 0, // отпускные не привязаны к окладу
      month: vacStartInYear.getMonth() + 1,
    });
  }

  // Объединяем и сортируем все события
  const allEvents = [
    ...events.map((e) => ({ ...e, isBonus: false as const })),
    ...bonusEvents.map((b) => ({ id: b.id, date: b.date, gross: b.gross, salaryAmount: b.salaryAmount, isBonus: true as const })),
    ...vacationEvents.map((v) => ({ ...v, isBonus: false as const })),
  ].sort((a, b) => a.date.getTime() - b.date.getTime());

  // Проходим по всем событиям и рассчитываем НДФЛ
  for (const event of allEvents) {
    const isBonus = 'isBonus' in event && event.isBonus;

    // Если есть факт — используем его для расчёта НДФЛ и накопленного дохода
    const factGross = facts?.[event.id];
    const effectiveGross = factGross ?? event.gross;

    const result = calculateNdflForPayment(effectiveGross, accumulatedIncome, totalTaxPaid, year);
    const yearToDateGross = result.newAccumulatedIncome;

    if (!isBonus) {
      payments.push({
        id: event.id,
        date: event.date,
        originalDate: event.originalDate,
        type: event.type,
        salaryAmount: event.salaryAmount,
        gross: event.gross,
        ...(factGross !== undefined ? { fact: factGross } : {}),
        ndfls: result.breakdown,
        ndfl: result.ndfl,
        net: effectiveGross - result.ndfl,
        yearToDateGross,
        month: event.month,
      });
    } else {
      payments.push({
        id: event.id,
        date: event.date,
        type: 'bonus',
        salaryAmount: event.salaryAmount,
        gross: event.gross,
        ...(factGross !== undefined ? { fact: factGross } : {}),
        ndfls: result.breakdown,
        ndfl: result.ndfl,
        net: effectiveGross - result.ndfl,
        yearToDateGross,
      });
    }

    accumulatedIncome = result.newAccumulatedIncome;
    totalTaxPaid = result.newTotalTax;
  }

  payments.sort((a, b) => a.date.getTime() - b.date.getTime());

  return {
    payments,
    vacationDays: vacationDaysMap,
  };
}

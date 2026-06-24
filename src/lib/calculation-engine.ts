import { getDaysInMonth } from 'date-fns';
import type { SalarySettings, Bonus, Payment, YearCalculation, CalendarData, Vacation, SalaryChange } from '@/types';
import { calculateNdflForPayment } from './ndfl';
import { findPreviousWorkday, countWorkdays, isDayOff, countWorkdaysBack } from '@/services/calendar';
import { dateToKey } from './utils';

/**
 * Обратный расчёт: по сумме «на руки» и накопленному доходу до выплаты
 * находит сумму до НДФЛ. Использует бинарный поиск с верификацией через calculateNdflForPayment.
 */
export function grossFromNet(net: number, priorYtdGross: number, year: number): number {
  let lo = net;
  let hi = Math.ceil(net / 0.78);

  for (let i = 0; i < 100; i++) {
    const mid = Math.round((lo + hi) / 2);
    const check = calculateNdflForPayment(mid, priorYtdGross, year);
    const midNetRounded = Math.round(mid - check.ndfl);
    if (midNetRounded === net) return mid;
    if (midNetRounded < net) lo = mid + 1;
    else hi = mid - 1;
  }

  // Линейный поиск вокруг лучшего приближения
  for (let g = Math.max(net, lo - 5); g <= hi + 5; g++) {
    const c = calculateNdflForPayment(g, priorYtdGross, year);
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
 * Возвращает оклад на указанную дату (с учётом дня вступления).
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
 * Возвращает массив рабочих дней в диапазоне [startDay..endDay] месяца.
 */
function getWorkdaysInRange(
  year: number,
  month: number,
  startDay: number,
  endDay: number,
  calendarData: CalendarData
): Date[] {
  const result: Date[] = [];
  for (let d = startDay; d <= endDay; d++) {
    const date = new Date(year, month, d);
    if (!isDayOff(date, calendarData)) {
      result.push(date);
    }
  }
  return result;
}

/**
 * Пер-день расчёт gross за период [startDay..endDay] месяца.
 * Для каждого рабочего дня: пропускаем отпускные, берём оклад на этот день, считаем dayRate.
 */
function calculatePeriodGross(
  year: number,
  month: number,
  startDay: number,
  endDay: number,
  vacationDaysSet: Set<string>,
  totalWorkdaysInMonth: number,
  calendarData: CalendarData,
  sortedChanges: readonly SalaryChange[]
): number {
  const workdays = getWorkdaysInRange(year, month, startDay, endDay, calendarData);
  let gross = 0;

  for (const day of workdays) {
    // Пропускаем дни отпуска
    if (vacationDaysSet.has(dateToKey(day))) continue;

    const salary = getSalaryForDate(day, sortedChanges);
    if (salary <= 0) continue;

    gross += salary / totalWorkdaysInMonth;
  }

  return gross;
}

/**
 * Распределение по отработанным дням: аванс пропорционален 1–15, зарплата — остаток.
 */
function calculateByWorkedDays(
  advanceGross: number,
  salaryGross: number
): { advance: number; salary: number } {
  return {
    advance: Math.max(0, advanceGross),
    salary: Math.max(0, salaryGross),
  };
}

/**
 * Распределение 50/50: половина оклада в авансе, половина — в зарплате.
 */
function calculateFiftyFifty(monthGross: number): { advance: number; salary: number } {
  const half = monthGross / 2;
  return {
    advance: half,
    salary: half,
  };
}

/**
 * Суммирует gross всех выплат зарплаты (advance + salary) за указанный период дат [fromDate, toDate).
 * Используется для расчёта дохода за 12 месяцев перед отпуском.
 */
function getIncomeForPeriod(
  fromDate: Date,
  toDate: Date,
  allCalculations: Map<number, YearCalculation>
): number {
  let total = 0;

  for (const [, calc] of allCalculations) {
    for (const payment of calc.payments) {
      if (payment.type !== 'advance' && payment.type !== 'salary') continue;
      const pDate = payment.date;
      if (pDate >= fromDate && pDate < toDate) {
        total += payment.gross;
      }
    }
  }

  return total;
}

/**
 * Суммирует gross отпускных за указанный период дат [fromDate, toDate).
 */
function getVacationPaymentsForPeriod(
  fromDate: Date,
  toDate: Date,
  allCalculations: Map<number, YearCalculation>
): number {
  let total = 0;

  for (const [, calc] of allCalculations) {
    for (const payment of calc.payments) {
      if (payment.type !== 'vacation') continue;
      const pDate = payment.date;
      if (pDate >= fromDate && pDate < toDate) {
        total += payment.gross;
      }
    }
  }

  return total;
}

/**
 * Рассчитывает отпускные для одного отпуска.
 */
function calculateVacationPayment(
  vacation: Vacation,
  vacations: Vacation[],
  year: number,
  calendarData: CalendarData,
  allCalculations: Map<number, YearCalculation>
): { gross: number; paymentDate: Date; originalDate: Date } | null {
  if (vacation.type !== 'paid') return null;

  // Дни отпуска в текущем году из массива dates[]
  const datesInYear = vacation.dates.filter(d => d.getFullYear() === year);
  if (datesInYear.length <= 0) return null;

  // Расчётный период — 12 календарных месяцев до месяца начала отпуска
  const vacStartMonth = vacation.startDate.getMonth();
  const vacStartYear = vacation.startDate.getFullYear();
  const periodStart = new Date(vacStartYear, vacStartMonth - 12, 1);

  // Собираем доход за расчётный период (все выплаты зарплаты)
  let includedIncome = getIncomeForPeriod(periodStart, new Date(vacStartYear, vacStartMonth + 1, 1), allCalculations);

  // Вычитаем отпускные из дохода за расчётный период
  const vacationPaymentsInPeriod = getVacationPaymentsForPeriod(periodStart, new Date(vacStartYear, vacStartMonth + 1, 1), allCalculations);
  includedIncome -= vacationPaymentsInPeriod;
  if (includedIncome < 0) includedIncome = 0;

  // Считаем делитель по месяцам расчётного периода.
  const relevantVacations = vacations.filter(v => {
    if (v.type !== 'paid') return false;
    return v.dates.some(d => d >= periodStart && d < new Date(vacStartYear, vacStartMonth + 1, 1));
  });

  let includedDays = 0;
  for (let m = 0; m < 12; m++) {
    const monthDate = new Date(vacStartYear, vacStartMonth - 12 + m, 1);
    const calDaysInMonth = getDaysInMonth(monthDate);

    // Проверяем, есть ли дни отпуска в этом месяце расчётного периода
    const hasVacationInMonth = relevantVacations.some(v =>
      v.dates.some(d => d.getFullYear() === monthDate.getFullYear() && d.getMonth() === monthDate.getMonth())
    );

    if (!hasVacationInMonth) {
      includedDays += AVG_MONTH_DAYS;
    } else {
      // Неполный месяц — исключаем только дни отпуска, праздники НЕ вычитаются (ст. 139 ТК РФ).
      const vacationDayKeys = new Set<string>();
      for (const v of relevantVacations) {
        for (const d of v.dates) {
          if (d.getFullYear() === monthDate.getFullYear() && d.getMonth() === monthDate.getMonth()) {
            vacationDayKeys.add(dateToKey(d));
          }
        }
      }

      let includedCalDays = 0;
      for (let d = 1; d <= calDaysInMonth; d++) {
        const dayDate = new Date(monthDate.getFullYear(), monthDate.getMonth(), d);
        if (!vacationDayKeys.has(dateToKey(dayDate))) {
          includedCalDays++;
        }
      }

      includedDays += (AVG_MONTH_DAYS / calDaysInMonth) * includedCalDays;
    }
  }

  if (includedDays <= 0 || includedIncome <= 0) {
    return null;
  }

  const averageDaily = includedIncome / includedDays;
  const gross = Math.round(averageDaily * datesInYear.length);

  if (gross <= 0) {
    return null;
  }

  // Дата выплаты — не позднее чем за 3 календарных дня до начала части отпуска в этом году
  const firstDateInYear = datesInYear[0]!;
  const paymentDateRaw = new Date(firstDateInYear);
  paymentDateRaw.setDate(paymentDateRaw.getDate() - 3);
  const adjustedPaymentDate = findPreviousWorkday(paymentDateRaw, calendarData);

  return {
    gross,
    paymentDate: adjustedPaymentDate,
    originalDate: paymentDateRaw,
  };
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
  calendarData: CalendarData | null,
  facts?: Record<string, number>,
  allCalculations?: Map<number, YearCalculation>
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

  // Собираем все дни отпусков для отображения на календаре
  for (const v of vacations) {
    for (const d of v.dates) {
      if (d.getFullYear() === year) {
        vacationDaysMap.set(dateToKey(d), true);
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
    const totalWorkdaysInMonth = countWorkdays(
      new Date(year, month, 1),
      new Date(year, month + 1, 0),
      calendarData
    );

    // Собираем дни отпуска в этом месяце для пер-день расчёта
    const vacationDaysSet = new Set<string>();
    for (const v of vacations) {
      for (const d of v.dates) {
        if (d.getFullYear() === year && d.getMonth() === month) {
          vacationDaysSet.add(dateToKey(d));
        }
      }
    }

    const lastDayOfMonth = getDaysInMonth(new Date(year, month));

    // Пер-день расчёт аванса (1–15) и зарплаты (16–end)
    const advancePeriodGross = calculatePeriodGross(
      year, month, 1, Math.min(15, lastDayOfMonth),
      vacationDaysSet, totalWorkdaysInMonth, calendarData, sortedChanges
    );

    const salaryPeriodGross = calculatePeriodGross(
      year, month, 16, lastDayOfMonth,
      vacationDaysSet, totalWorkdaysInMonth, calendarData, sortedChanges
    );

    // Распределяем в зависимости от режима
    let advanceGross: number;
    let salaryGross: number;

    if (settings.distribution === 'fifty-fifty') {
      const monthGross = advancePeriodGross + salaryPeriodGross;
      const result = calculateFiftyFifty(monthGross);
      advanceGross = result.advance;
      salaryGross = result.salary;
    } else {
      const result = calculateByWorkedDays(advancePeriodGross, salaryPeriodGross);
      advanceGross = result.advance;
      salaryGross = result.salary;
    }

    // Определяем даты выплат
    const advanceDate = new Date(year, month, settings.advancePaymentDay);
    const advanceInYear = advanceDate.getFullYear() === year;
    let adjustedAdvance: Date | null = null;
    if (advanceInYear) {
      adjustedAdvance = findPreviousWorkday(advanceDate, calendarData);
    }

    // В декабре — зарплата за 1 рабочий день до последнего рабочего дня месяца
    let salaryDate: Date;
    if (month === 11) {
      const monthEnd = new Date(year, month + 1, 0);
      const lastWorkday = findPreviousWorkday(monthEnd, calendarData);
      salaryDate = countWorkdaysBack(1, lastWorkday, calendarData);
    } else {
      salaryDate = new Date(year, month + 1, settings.salaryPaymentDay);
    }
    const salaryInYear = salaryDate.getFullYear() === year;
    let adjustedSalary: Date | null = null;
    if (salaryInYear) {
      adjustedSalary = findPreviousWorkday(salaryDate, calendarData);
    }

    // Если ни аванс, ни зарплата не в рамках года — пропускаем месяц
    if (!advanceInYear && !salaryInYear) continue;

    // Если аванс ушёл в другой год — переносим его сумму в зарплату
    if (!advanceInYear && salaryInYear) {
      salaryGross += advanceGross;
    }

    const monthSalary = getSalaryForDate(new Date(year, month, 15), sortedChanges);

    if (adjustedAdvance) {
      events.push({
        id: `sal:${year}:${String(month + 1).padStart(2, '0')}:a`,
        date: adjustedAdvance,
        originalDate: advanceDate,
        type: 'advance',
        gross: advanceGross,
        salaryAmount: monthSalary,
        month: month + 1,
      });
    }

    if (adjustedSalary) {
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

  // Добавляем отпускные
  const vacationEvents: ScheduledEvent[] = [];
  if (allCalculations) {
    for (const v of vacations) {
      const result = calculateVacationPayment(v, vacations, year, calendarData, allCalculations);
      if (!result) continue;

      // Проверяем, что дата выплаты в текущем году
      if (result.paymentDate.getFullYear() !== year) continue;

      vacationEvents.push({
        id: v.id,
        date: result.paymentDate,
        originalDate: result.originalDate,
        type: 'vacation',
        gross: result.gross,
        salaryAmount: 0,
        month: new Date(v.startDate).getMonth() + 1,
      });
    }
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

    const result = calculateNdflForPayment(effectiveGross, accumulatedIncome, year);
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
  }

  payments.sort((a, b) => a.date.getTime() - b.date.getTime());

  return {
    payments,
    vacationDays: vacationDaysMap,
  };
}

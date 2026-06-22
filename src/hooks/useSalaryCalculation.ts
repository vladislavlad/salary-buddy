import { useMemo } from 'react';
import { getDaysInMonth, eachDayOfInterval } from 'date-fns';
import type { SalarySettings, Bonus, PaymentInfo, YearCalculation, CalendarData, BonusPaymentInfo, Vacation, VacationSettings } from '@/types';
import { calculateNdflForPayment } from '@/lib/ndfl';
import { findPreviousWorkday, countWorkdays, isDayOff } from '@/services/calendar';

interface ScheduledEvent {
  date: Date;
  originalDate: Date;
  type: 'advance' | 'salary' | 'vacation';
  gross: number;
  month: number;
}

interface BonusEvent {
  date: Date;
  gross: number;
}

// Среднемесячное число календарных дней по ТК РФ
const AVG_MONTH_DAYS = 29.3;

export function useSalaryCalculation(
  settings: SalarySettings | null,
  bonuses: Bonus[],
  vacations: Vacation[],
  vacationSettings: VacationSettings,
  calendarData: CalendarData | null,
  year: number
): YearCalculation | null {
  return useMemo(() => {
    if (!settings || !calendarData) return null;

    const payments: PaymentInfo[] = [];
    const bonusPayments: BonusPaymentInfo[] = [];
    const vacationDaysMap = new Map<string, boolean>();
    let accumulatedIncome = 0;
    let totalTaxPaid = 0;

    // Собираем все дни отпусков для отображения на календаре
    for (const v of vacations) {
      const days = eachDayOfInterval({ start: v.startDate, end: v.endDate });
      for (const d of days) {
        if (d.getFullYear() === year) {
          const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
          vacationDaysMap.set(key, true);
        }
      }
    }

    // Собираем все выплаты и премии в хронологическом порядке
    const events: ScheduledEvent[] = [];

    // Генерируем выплаты зарплаты по месяцам
    for (let month = 0; month < 12; month++) {
      const monthStart = new Date(year, month, 1);
      const monthEnd = new Date(year, month + 1, 0);

      // Аванс за месяц M платится на salaryDay месяца M (первая половина)
      const advanceDate = new Date(year, month, settings.salaryDay);
      if (advanceDate.getFullYear() !== year) continue;
      const adjustedAdvance = findPreviousWorkday(advanceDate, calendarData);

      // В декабре — полная выплата в день аванса (расчёт до конца года)
      if (month === 11) {
        events.push({
          date: adjustedAdvance,
          originalDate: advanceDate,
          type: 'salary',
          gross: settings.salary,
          month: month + 1,
        });
        continue;
      }

      // Зарплата за месяц M платится на advanceDay месяца M+1 (вторая половина)
      const salaryDate = new Date(year, month + 1, settings.advanceDay);
      if (salaryDate.getFullYear() !== year) continue;
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

        // Диапазон первой половины: 1..15
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

        // Диапазон второй половины: 16..конец месяца
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
        advanceGross = settings.salary / 2;
        salaryGross = settings.salary / 2;

        // Вычитаем дни отпуска из аванса и зарплаты
        if (totalWorkdaysInMonth > 0) {
          const dayRate = settings.salary / totalWorkdaysInMonth;
          let advanceDeduction = vacationWorkdaysFirstHalf * dayRate;
          let salaryDeduction = vacationWorkdaysSecondHalf * dayRate;

          // Если аванс ушёл в минус — переносим избыток на зарплату
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
        // По отработанным дням — вычитаем отпускные рабочие дни из базы расчёта
        const actualWorkdaysFirstHalf = workdaysFirstHalf - vacationWorkdaysFirstHalf;

        if (totalWorkdaysInMonth > 0) {
          advanceGross = settings.salary * (actualWorkdaysFirstHalf / totalWorkdaysInMonth);
          salaryGross = settings.salary - advanceGross;

          // Из зарплаты также вычитаем дни отпуска второй половины
          const vacationDeductionSecondHalf = vacationWorkdaysSecondHalf * (settings.salary / totalWorkdaysInMonth);
          salaryGross -= vacationDeductionSecondHalf;
          if (salaryGross < 0) salaryGross = 0;
        } else {
          advanceGross = settings.salary / 2;
          salaryGross = settings.salary / 2;
        }
      }

      events.push({
        date: adjustedAdvance,
        originalDate: advanceDate,
        type: 'advance',
        gross: advanceGross,
        month: month + 1,
      });

      events.push({
        date: adjustedSalary,
        originalDate: salaryDate,
        type: 'salary',
        gross: salaryGross,
        month: month + 1,
      });
    }

    // Сортируем все события по дате
    events.sort((a, b) => a.date.getTime() - b.date.getTime());

    // Добавляем премии в общий список событий
    const bonusEvents: BonusEvent[] = bonuses.map((b) => ({
      date: new Date(b.date),
      gross: b.type === 'salaries' ? b.amount * settings.salary : b.amount,
    }));

    // Добавляем отпускные (только оплачиваемые отпуска)
    const vacationEvents: ScheduledEvent[] = [];
    for (const v of vacations) {
      if (v.type !== 'paid') continue;

      // Считаем календарные дни отпуска в рамках года
      const vacStartInYear = v.startDate < new Date(year, 0, 1) ? new Date(year, 0, 1) : new Date(v.startDate);
      const vacEndInYear = v.endDate > new Date(year, 11, 31) ? new Date(year, 11, 31) : new Date(v.endDate);

      if (vacStartInYear.getFullYear() !== year && vacEndInYear.getFullYear() !== year) continue;

      const calendarDays = Math.round((vacEndInYear.getTime() - vacStartInYear.getTime()) / (1000 * 60 * 60 * 24)) + 1;
      if (calendarDays <= 0) continue;

      // СДЗ = доход за 12 мес / 12 / 29,3
      const annualIncome = vacationSettings.annualIncome12m ?? settings.salary * 12;
      const avgDailyEarnings = annualIncome / 12 / AVG_MONTH_DAYS;
      const gross = Math.round(avgDailyEarnings * calendarDays);

      // Выплата за 2 дня до начала отпуска (в рамках года)
      const paymentDateRaw = new Date(vacStartInYear);
      paymentDateRaw.setDate(paymentDateRaw.getDate() - 2);
      const adjustedPaymentDate = findPreviousWorkday(paymentDateRaw, calendarData);

      vacationEvents.push({
        date: adjustedPaymentDate,
        originalDate: paymentDateRaw,
        type: 'vacation',
        gross,
        month: vacStartInYear.getMonth() + 1,
      });
    }

    // Объединяем и сортируем все события
    const allEvents = [
      ...events.map((e) => ({ ...e, isBonus: false as const })),
      ...bonusEvents.map((b) => ({ date: b.date, gross: b.gross, isBonus: true as const })),
      ...vacationEvents.map((v) => ({ ...v, isBonus: false as const })),
    ].sort((a, b) => a.date.getTime() - b.date.getTime());

    // Проходим по всем событиям и рассчитываем НДФЛ
    for (const event of allEvents) {
      const isBonus = 'isBonus' in event && event.isBonus;

      const result = calculateNdflForPayment(event.gross, accumulatedIncome, totalTaxPaid);

      if (!isBonus) {
        payments.push({
          date: event.date,
          originalDate: event.originalDate,
          type: event.type,
          gross: event.gross,
          ndfl: result.ndfl,
          net: event.gross - result.ndfl,
          month: event.month,
          taxBreakdown: result.breakdown,
        });
      } else {
        bonusPayments.push({
          date: event.date,
          gross: event.gross,
          ndfl: result.ndfl,
          net: event.gross - result.ndfl,
          taxBreakdown: result.breakdown,
        });
      }

      accumulatedIncome = result.newAccumulatedIncome;
      totalTaxPaid = result.newTotalTax;
    }

    // Сортируем выплаты по дате для отображения
    payments.sort((a, b) => a.date.getTime() - b.date.getTime());

    const totalGross = payments.reduce((sum, p) => sum + p.gross, 0) + bonusPayments.reduce((sum, p) => sum + p.gross, 0);
    const totalNdfl = payments.reduce((sum, p) => sum + p.ndfl, 0) + bonusPayments.reduce((sum, p) => sum + p.ndfl, 0);
    const totalNet = payments.reduce((sum, p) => sum + p.net, 0) + bonusPayments.reduce((sum, p) => sum + p.net, 0);

    return {
      payments,
      bonusPayments,
      vacationDays: vacationDaysMap,
      totalGross,
      totalNdfl,
      totalNet,
    };
  }, [settings, bonuses, vacations, vacationSettings, calendarData, year]);
}

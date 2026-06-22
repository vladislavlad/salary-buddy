import { useMemo } from 'react';
import type { SalarySettings, Bonus, PaymentInfo, YearCalculation, CalendarData } from '@/types';
import { calculateNdflForPayment } from '@/lib/ndfl';
import { findPreviousWorkday, countWorkdays } from '@/services/calendar';

/**
 * Основной хук для расчёта зарплаты за год.
 */
export function useSalaryCalculation(
  settings: SalarySettings | null,
  bonuses: Bonus[],
  calendarData: CalendarData | null,
  year: number
): YearCalculation | null {
  return useMemo(() => {
    if (!settings || !calendarData) return null;

    const payments: PaymentInfo[] = [];
    let accumulatedIncome = 0;
    let totalTaxPaid = 0;

    // Собираем все выплаты и премии в хронологическом порядке
    interface ScheduledEvent {
      date: Date;
      originalDate: Date;
      type: 'advance' | 'salary';
      gross: number;
      month: number;
    }

    const events: ScheduledEvent[] = [];

    // Генерируем выплаты зарплаты по месяцам
    for (let month = 0; month < 12; month++) {
      // Аванс
      let advanceDate = new Date(year, month, settings.advanceDay);
      if (advanceDate.getFullYear() !== year) continue;

      const adjustedAdvance = findPreviousWorkday(advanceDate, calendarData);

      // Зарплата
      let salaryDate = new Date(year, month, settings.salaryDay);
      if (salaryDate.getFullYear() !== year) continue;

      const adjustedSalary = findPreviousWorkday(salaryDate, calendarData);

      // Рассчитываем суммы в зависимости от режима распределения
      let advanceGross: number;
      let salaryGross: number;

      if (settings.distribution === 'fifty-fifty') {
        advanceGross = settings.salary / 2;
        salaryGross = settings.salary / 2;
      } else {
        // По отработанным дням
        const monthStart = new Date(year, month, 1);
        const monthEnd = new Date(year, month + 1, 0);

        const totalWorkdaysInMonth = countWorkdays(monthStart, monthEnd, calendarData);
        const workdaysBeforeAdvance = countWorkdays(adjustedAdvance, adjustedSalary, calendarData);

        if (totalWorkdaysInMonth > 0) {
          advanceGross = settings.salary * (workdaysBeforeAdvance / totalWorkdaysInMonth);
          salaryGross = settings.salary - advanceGross;
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
    interface BonusEvent {
      date: Date;
      gross: number;
    }

    const bonusEvents: BonusEvent[] = bonuses.map((b) => ({
      date: new Date(b.date),
      gross: b.type === 'gross' ? b.amount : 0,
    }));

    // Объединяем и сортируем все события
    const allEvents = [
      ...events.map((e) => ({ ...e, isBonus: false as const })),
      ...bonusEvents.map((b) => ({ date: b.date, gross: b.gross, isBonus: true as const })),
    ].sort((a, b) => a.date.getTime() - b.date.getTime());

    // Проходим по всем событиям и рассчитываем НДФЛ
    for (const event of allEvents) {
      if ('isBonus' in event && event.isBonus) continue;

      const result = calculateNdflForPayment(event.gross, accumulatedIncome, totalTaxPaid);

      payments.push({
        date: event.date,
        originalDate: event.originalDate,
        type: event.type,
        gross: event.gross,
        ndfl: result.ndfl,
        net: event.gross - result.ndfl,
        month: event.month,
      });

      accumulatedIncome = result.newAccumulatedIncome;
      totalTaxPaid = result.newTotalTax;
    }

    // Сортируем выплаты по дате для отображения
    payments.sort((a, b) => a.date.getTime() - b.date.getTime());

    const totalGross = payments.reduce((sum, p) => sum + p.gross, 0);
    const totalNdfl = payments.reduce((sum, p) => sum + p.ndfl, 0);
    const totalNet = payments.reduce((sum, p) => sum + p.net, 0);

    return {
      payments,
      bonuses: [],
      totalGross,
      totalNdfl,
      totalNet,
    };
  }, [settings, bonuses, calendarData, year]);
}

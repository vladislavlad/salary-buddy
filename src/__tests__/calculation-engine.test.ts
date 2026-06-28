import { describe, it, expect } from "vitest";
import { calculateAll } from "@/features/payments/model/calculation-engine";
import type { SalaryCalculationSettings, CalendarData, SickLeaveSettings } from "@/shared/types";
import { localDate } from "@/shared/types/local-date";
import { loadCalendar } from "@/__tests__/fixtures/calendars.ts";

describe("calculation-engine", () => {
  it("распределяет оклад по отработанным дням за июль 2025 (копейки)", () => {
    const salaryAmountKop = 250_000 * 100; // 250 000 ₽ в копейках
    const year = 2025;

    const settings: SalaryCalculationSettings = {
      advancePaymentDay: 15,
      salaryPaymentDay: 30,
      distribution: "by-worked-days",
      salaryChanges: [
        {
          id: "1",
          effectiveDate: localDate(year, 1, 1),
          amount: salaryAmountKop,
        },
      ],
    };

    const calendarsByYear = new Map<number, CalendarData>();
    calendarsByYear.set(year, loadCalendar(year));

    const sickLeaveSettings: SickLeaveSettings = {
      enableTopUp: false,
      topUpDaysLimitPerYear: 30,
    };

    const payments = calculateAll({
      settings,
      bonuses: [],
      surcharges: [],
      vacations: [],
      sickLeaves: [],
      sickLeaveSettings,
      calendarsByYear,
    });

    // Фильтруем выплаты за июль (месяц = 7)
    const julyPayments = payments.filter((p) => p.month === 7);
    const advancePayment = julyPayments.find((p) => p.type === "advance");
    const salaryPayment = julyPayments.find((p) => p.type === "salary");

    expect(advancePayment).toBeDefined();
    expect(salaryPayment).toBeDefined();

    const advanceGrossKop = advancePayment!.gross;
    const salaryGrossKop = salaryPayment!.gross;
    const totalGrossKop = advanceGrossKop + salaryGrossKop;

    // gross за месяц в копейках ≈ оклад (небольшая разница из-за округления пер-день)
    expect(totalGrossKop).toBeCloseTo(salaryAmountKop, -4);

    // Считаем рабочие дни вручную для проверки пропорций
    // Июль 2025: Пн=1, Сб=5,12,19,26, Вс=6,13,20,27 – без праздников
    const workdaysFirstHalf = [1, 2, 3, 4, 7, 8, 9, 10, 11, 14, 15].length; // 11
    const workdaysSecondHalf = [16, 17, 18, 21, 22, 23, 24, 25, 28, 29, 30, 31]
      .length; // 12
    const totalWorkdays = workdaysFirstHalf + workdaysSecondHalf; // 23

    expect(advanceGrossKop).toBeCloseTo(
      salaryAmountKop * (workdaysFirstHalf / totalWorkdays),
      -4,
    );
    expect(salaryGrossKop).toBeCloseTo(
      salaryAmountKop * (workdaysSecondHalf / totalWorkdays),
      -4,
    );
  });
});

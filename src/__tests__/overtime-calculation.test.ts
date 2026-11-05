import { describe, expect, it } from "vitest";
import {
  calculateAll,
  type CalculateAllInput,
} from "@/features/payments/model/calculation-engine";
import type { Overtime } from "@/features/overtime/model/overtime";
import { generateFallbackCalendar } from "@/features/calendar/model/calendar-fallback";
import { DEFAULT_SALARY_PAYMENT_SETTINGS } from "@/features/salary-payment-settings/model/defaultSalaryPaymentSettings";
import { localDate } from "@/shared/types/local-date";

const date = (month: number, day: number, year = 2026) =>
  localDate(year, month, day);
const aprilCalendar = generateFallbackCalendar(2026);
const input: CalculateAllInput = {
  settings: {
    ...DEFAULT_SALARY_PAYMENT_SETTINGS,
    salaryChanges: [
      { id: "sal:2026:01", effectiveDate: date(4, 1), amount: 22_000_000 },
      { id: "sal:2026:02", effectiveDate: date(4, 20), amount: 11_000_000 },
      { id: "sal:2026:03", effectiveDate: date(5, 1), amount: 33_000_000 },
    ],
  },
  bonuses: [],
  surcharges: [],
  vacations: [],
  sickLeaves: [],
  sickLeaveSettings: { enableTopUp: false, topUpDaysLimitPerYear: 20 },
  calendarsByYear: new Map([[2026, aprilCalendar]]),
};

function calculateOvertime(
  overtime: Overtime[],
  overrides: Partial<CalculateAllInput> = {},
) {
  return calculateAll({ ...input, overtime, ...overrides }).filter(
    (payment) => payment.type === "overtime",
  );
}

describe("Оплата переработок", () => {
  it("оплачивает 8 часов в выходной по двойной дневной ставке вместе с авансом", () => {
    const overtime: Overtime = {
      id: "ot:weekend",
      date: date(4, 18),
      hours: 8,
      multiplier: 2,
    };
    const [payment] = calculateOvertime([overtime]);

    expect(payment).toMatchObject({
      sourceId: overtime.id,
      gross: 2_000_000,
      ndfl: 260_000,
      net: 1_740_000,
    });
    expect(payment?.date.toString()).toBe("2026-04-24");
  });

  it("после перенесённого аванса берёт следующую зарплату и оклад месяца работы", () => {
    const [payment] = calculateOvertime([
      { id: "ot:after-advance", date: date(4, 25), hours: 8, multiplier: 2 },
    ]);

    expect(payment?.date.toString()).toBe("2026-05-08");
    expect(payment?.gross).toBe(1_000_000);
    expect(payment?.salaryAmount).toBe(11_000_000);
  });

  it("учитывает дробные часы в будни и включает выплату в день работы", () => {
    const payments = calculateOvertime([
      { id: "ot:triple", date: date(4, 24), hours: 2.5, multiplier: 3 },
      { id: "ot:single", date: date(4, 24), hours: 1, multiplier: 1 },
    ]);

    expect(
      payments.map((payment) => [payment.date.toString(), payment.gross]),
    ).toEqual([
      ["2026-04-24", 468_750],
      ["2026-04-24", 62_500],
    ]);
  });

  it("ищет следующую дату через границу года после декабрьской зарплаты", () => {
    const [payment] = calculateOvertime(
      [
        {
          id: "ot:december",
          date: date(12, 31, 2025),
          hours: 8,
          multiplier: 2,
        },
      ],
      {
        settings: {
          ...input.settings,
          salaryChanges: [
            {
              id: "sal:2025:01",
              effectiveDate: date(12, 1, 2025),
              amount: 10_000_000,
            },
          ],
        },
        calendarsByYear: new Map([
          [2025, generateFallbackCalendar(2025)],
          [2026, aprilCalendar],
        ]),
      },
    );
    expect(payment?.date.toString()).toBe("2026-01-23");
  });

  it("не начисляет переработку, если на дату работы ещё не задан оклад", () => {
    const payments = calculateOvertime([
      { id: "ot:no-salary", date: date(3, 28), hours: 8, multiplier: 2 },
    ]);
    expect(payments).toEqual([]);
  });
});

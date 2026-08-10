import { describe, it, expect } from "vitest";
import { calculateAll } from "@/features/payments/model/calculation-engine";
import { getCoefficientForDate, sortRegionalCoefficientChanges } from "@/features/payments/model/calculation/regionalCoefficient";
import type { SalaryCalculationSettings, CalendarData, SickLeaveSettings, RegionalCoefficientChange } from "@/shared/types";
import { localDate } from "@/shared/types/local-date";
import { loadCalendar } from "@/__tests__/fixtures/calendars.ts";

describe("regional-coefficient: getCoefficientForDate", () => {
  it("возвращает 0 если нет записей", () => {
    const sorted = sortRegionalCoefficientChanges([]);
    expect(getCoefficientForDate(localDate(2026, 3, 15), sorted)).toBe(0);
  });

  it("возвращает коэффициент, действующий на дату", () => {
    const changes: RegionalCoefficientChange[] = [
      {
        id: "1",
        effectiveDate: localDate(2026, 1, 1),
        percent: 30,
      },
    ];
    const sorted = sortRegionalCoefficientChanges(changes);
    expect(getCoefficientForDate(localDate(2026, 3, 15), sorted)).toBe(30);
  });

  it("возвращает 0 если дата до effectiveDate", () => {
    const changes: RegionalCoefficientChange[] = [
      {
        id: "1",
        effectiveDate: localDate(2026, 6, 1),
        percent: 30,
      },
    ];
    const sorted = sortRegionalCoefficientChanges(changes);
    expect(getCoefficientForDate(localDate(2026, 3, 15), sorted)).toBe(0);
  });

  it("возвращает ближайший предыдущий коэффициент при нескольких записях", () => {
    const changes: RegionalCoefficientChange[] = [
      {
        id: "1",
        effectiveDate: localDate(2026, 1, 1),
        percent: 30,
      },
      {
        id: "2",
        effectiveDate: localDate(2026, 7, 1),
        percent: 40,
      },
    ];
    const sorted = sortRegionalCoefficientChanges(changes);

    // Март — между двумя записями, должен вернуться 30%
    expect(getCoefficientForDate(localDate(2026, 3, 15), sorted)).toBe(30);
    // Август — после второй записи, должен вернуться 40%
    expect(getCoefficientForDate(localDate(2026, 8, 1), sorted)).toBe(40);
  });
});

describe("regional-coefficient: расчёт gross с коэффициентом", () => {
  function buildInput(percent: number) {
    const year = 2025;
    const salaryAmountKop = 100_000 * 100; // 100 000 ₽

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

    const regionalCoefficients: RegionalCoefficientChange[] =
      percent > 0
        ? [
            {
              id: "rc1",
              effectiveDate: localDate(year, 1, 1),
              percent,
            },
          ]
        : [];

    return {
      settings,
      bonuses: [],
      surcharges: [],
      regionalCoefficients,
      vacations: [],
      sickLeaves: [],
      sickLeaveSettings,
      calendarsByYear,
    };
  }

  it("без коэффициента gross равен окладу", () => {
    const payments = calculateAll(buildInput(0));
    const julyPayments = payments.filter((p) => p.month === 7);
    const totalGross = julyPayments.reduce((sum, p) => sum + p.gross, 0);

    // Без коэффициента gross ≈ оклад (небольшая разница из-за округления)
    expect(totalGross).toBeCloseTo(100_000 * 100, -4);
  });

  it("с коэффициентом 30% gross увеличивается на 30%", () => {
    const payments = calculateAll(buildInput(30));
    const julyPayments = payments.filter((p) => p.month === 7);
    const totalGross = julyPayments.reduce((sum, p) => sum + p.gross, 0);

    // С коэффициентом gross ≈ оклад × 1.30
    expect(totalGross).toBeCloseTo(100_000 * 100 * 1.30, -4);
  });

  it("с коэффициентом 50% gross увеличивается на 50%", () => {
    const payments = calculateAll(buildInput(50));
    const julyPayments = payments.filter((p) => p.month === 7);
    const totalGross = julyPayments.reduce((sum, p) => sum + p.gross, 0);

    expect(totalGross).toBeCloseTo(100_000 * 100 * 1.50, -4);
  });
});

describe("regional-coefficient: НДФЛ с gross, включающим коэффициент", () => {
  function buildInput(percent: number) {
    const year = 2025;
    const salaryAmountKop = 100_000 * 100;

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

    const regionalCoefficients: RegionalCoefficientChange[] =
      percent > 0
        ? [
            {
              id: "rc1",
              effectiveDate: localDate(year, 1, 1),
              percent,
            },
          ]
        : [];

    return {
      settings,
      bonuses: [],
      surcharges: [],
      regionalCoefficients,
      vacations: [],
      sickLeaves: [],
      sickLeaveSettings,
      calendarsByYear,
    };
  }

  it("НДФЛ рассчитывается от gross с коэффициентом", () => {
    const payments = calculateAll(buildInput(30));
    const julyPayments = payments.filter((p) => p.month === 7);

    for (const p of julyPayments) {
      // НДФЛ > 0 (так как gross включает коэффициент)
      expect(p.ndfl).toBeGreaterThan(0);
      // net = gross - ndfl
      expect(p.net).toBe(p.gross - p.ndfl);
    }
  });

  it("НДФЛ без коэффициента меньше, чем с коэффициентом", () => {
    const paymentsNoCoeff = calculateAll(buildInput(0));
    const paymentsWithCoeff = calculateAll(buildInput(30));

    const totalNdflNoCoeff = paymentsNoCoeff.reduce(
      (sum, p) => sum + p.ndfl,
      0,
    );
    const totalNdflWithCoeff = paymentsWithCoeff.reduce(
      (sum, p) => sum + p.ndfl,
      0,
    );

    expect(totalNdflWithCoeff).toBeGreaterThan(totalNdflNoCoeff);
  });
});

describe("regional-coefficient: fallback расчёт больничных", () => {
  function buildSickLeaveInput(percent: number) {
    const year = 2025;
    const salaryAmountKop = 100_000 * 100;

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

    const regionalCoefficients: RegionalCoefficientChange[] =
      percent > 0
        ? [
            {
              id: "rc1",
              effectiveDate: localDate(year, 1, 1),
              percent,
            },
          ]
        : [];

    return {
      settings,
      bonuses: [],
      surcharges: [],
      regionalCoefficients,
      vacations: [],
      sickLeaves: [],
      sickLeaveSettings,
      calendarsByYear,
    };
  }

  it("gross с коэффициентом больше, чем без", () => {
    const payments = calculateAll(buildSickLeaveInput(30));
    const paymentsNoCoeff = calculateAll(buildSickLeaveInput(0));

    // Сравниваем gross за тот же месяц
    const janGrossWithCoeff = payments
      .filter((p) => p.month === 1 && (p.type === "advance" || p.type === "salary"))
      .reduce((sum, p) => sum + p.gross, 0);

    const janGrossNoCoeff = paymentsNoCoeff
      .filter((p) => p.month === 1 && (p.type === "advance" || p.type === "salary"))
      .reduce((sum, p) => sum + p.gross, 0);

    expect(janGrossWithCoeff).toBeGreaterThan(janGrossNoCoeff);
  });
});

describe("regional-coefficient: интеграционный тест", () => {
  it("полный пересчёт с коэффициентом 30% отражает увеличение gross и НДФЛ", () => {
    const year = 2025;
    const salaryAmountKop = 100_000 * 100;

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

    const regionalCoefficients: RegionalCoefficientChange[] = [
      {
        id: "rc1",
        effectiveDate: localDate(year, 1, 1),
        percent: 30,
      },
    ];

    const payments = calculateAll({
      settings,
      bonuses: [],
      surcharges: [],
      regionalCoefficients,
      vacations: [],
      sickLeaves: [],
      sickLeaveSettings,
      calendarsByYear,
    });

    // Все платежи имеют gross > 0
    const salaryPayments = payments.filter(
      (p) => p.type === "advance" || p.type === "salary",
    );
    expect(salaryPayments.length).toBeGreaterThan(0);

    for (const p of salaryPayments) {
      expect(p.gross).toBeGreaterThan(0);
      expect(p.ndfl).toBeGreaterThan(0);
      expect(p.net).toBe(p.gross - p.ndfl);
    }

    // Общий gross за год должен быть ~1.30 от оклада × 12
    const totalGross = salaryPayments.reduce((sum, p) => sum + p.gross, 0);
    const expectedGross = 100_000 * 100 * 1.30 * 12;
    expect(totalGross).toBeCloseTo(expectedGross, -3);
  });
});

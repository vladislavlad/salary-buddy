import { describe, it, expect } from "vitest";
import { Temporal } from "@js-temporal/polyfill";
import { calculateAll } from "@/features/payments/model/calculation-engine";
import { calculateNdflForPayment } from "@/features/payments/model/ndfl";
import { getCoefficientForDate, sortRegionalCoefficientChanges } from "@/features/payments/model/calculation/regionalCoefficient";
import type {
  SalaryCalculationSettings,
  CalendarData,
  SickLeaveSettings,
  RegionalCoefficientChange,
  Bonus,
  SurchargeChange,
  Vacation,
  SickLeave,
  Payment,
} from "@/shared/types";
import { localDate, type LocalDate } from "@/shared/types/local-date";
import { isDayOff } from "@/features/calendar/model/calendar";
import { loadCalendar } from "@/__tests__/fixtures/calendars.ts";

function countWorkdaysInMonth(year: number, month: number): number {
  const cal = loadCalendar(year);
  const lastDay = localDate(year, month, 1).daysInMonth;
  let count = 0;
  for (let d = 1; d <= lastDay; d++) {
    if (!isDayOff(localDate(year, month, d), cal)) count++;
  }
  return count;
}

function countWorkdaysBetween(from: LocalDate, to: LocalDate): number {
  const cal = loadCalendar(from.year);
  let d = from;
  let count = 0;
  while (Temporal.PlainDate.compare(d, to) <= 0) {
    if (!isDayOff(d, cal)) count++;
    d = d.add({ days: 1 });
  }
  return count;
}

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
  // Оклад начинается в 2026, больничный в 2026 – дохода за 2024–2025 нет,
  // поэтому СДЗ считается по fallback (оклад × 24 / 730).
  function buildSickLeaveInput(
    percent: number,
    settings?: Partial<SickLeaveSettings>,
  ) {
    const year = 2026;
    const salaryAmountKop = 100_000 * 100;

    const sickLeave: SickLeave = {
      id: "sl1",
      startDate: localDate(year, 3, 2),
      calendarDays: 10,
      dates: Array.from({ length: 10 }, (_, i) =>
        localDate(year, 3, 2).add({ days: i }),
      ),
      reason: "illness",
      experience: "8plus",
    };

    const calendarsByYear = new Map<number, CalendarData>();
    calendarsByYear.set(year, loadCalendar(year));

    return {
      settings: {
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
      } as SalaryCalculationSettings,
      bonuses: [] as Bonus[],
      surcharges: [] as SurchargeChange[],
      regionalCoefficients:
        percent > 0
          ? ([
              {
                id: "rc1",
                effectiveDate: localDate(year, 1, 1),
                percent,
              },
            ] as RegionalCoefficientChange[])
          : ([] as RegionalCoefficientChange[]),
      vacations: [] as Vacation[],
      sickLeaves: [sickLeave],
      sickLeaveSettings: {
        enableTopUp: false,
        topUpDaysLimitPerYear: 20,
        ...settings,
      } as SickLeaveSettings,
      calendarsByYear,
    };
  }

  it("fallback СДЗ считается от оклада с коэффициентом", () => {
    const payments = calculateAll(buildSickLeaveInput(30));

    // СДЗ = 130 000 × 24 / 730 = 427 397 kop/день; работодатель – дни 1–3.
    const employer = payments.find((p) => p.type === "sick-leave");
    expect(employer).toBeDefined();
    expect(employer!.gross).toBe(3 * 427_397);

    // СФР – дни 4–10, без НДФЛ.
    const sfr = payments.find((p) => p.type === "sick-leave-sfr");
    expect(sfr).toBeDefined();
    expect(sfr!.gross).toBe(7 * 427_397);
    expect(sfr!.ndfl).toBe(0);
  });

  it("fallback без коэффициента использует базовый оклад", () => {
    const payments = calculateAll(buildSickLeaveInput(0));

    // СДЗ = 100 000 × 24 / 730 = 328 767 kop/день.
    const employer = payments.find((p) => p.type === "sick-leave");
    expect(employer!.gross).toBe(3 * 328_767);
  });

  it("доплата до оклада считается от дневного оклада с коэффициентом", () => {
    const payments = calculateAll(
      buildSickLeaveInput(30, { enableTopUp: true }),
    );

    const workdaysInMarch = countWorkdaysInMonth(2026, 3);
    const dailySalaryKop = Math.round((130_000 * 100) / workdaysInMarch);
    const dailyBenefitKop = 427_397;
    const topUpPerDay = Math.max(0, dailySalaryKop - dailyBenefitKop);
    const workdaysInSickLeave = countWorkdaysBetween(
      localDate(2026, 3, 2),
      localDate(2026, 3, 11),
    );

    const topUps = payments.filter((p) => p.type === "sick-leave-topup");
    expect(topUps.length).toBeGreaterThan(0);
    const totalTopUp = topUps.reduce((sum, p) => sum + p.gross, 0);
    expect(totalTopUp).toBe(topUpPerDay * workdaysInSickLeave);
  });

  it("доплата с коэффициентом больше, чем без", () => {
    const withCoeff = calculateAll(
      buildSickLeaveInput(30, { enableTopUp: true }),
    );
    const noCoeff = calculateAll(
      buildSickLeaveInput(0, { enableTopUp: true }),
    );

    const sum = (ps: Payment[]) =>
      ps.filter((p) => p.type === "sick-leave-topup").reduce((s, p) => s + p.gross, 0);
    expect(sum(withCoeff)).toBeGreaterThan(sum(noCoeff));
  });
});

describe("regional-coefficient: отдельная база НДФЛ для части РК", () => {
  it("2026: часть РК облагается 13% в отдельной базе", () => {
    // gross 130 000 ₽, из них часть РК 30 000 ₽.
    const result = calculateNdflForPayment(13_000_000, 0, 2026, {
      rcKop: 3_000_000,
    });

    // Основная база: 100 000 × 13% = 13 000; база РК: 30 000 × 13% = 3 900.
    expect(result.ndfl).toBe(1_690_000);
    expect(result.newAccumulatedIncome).toBe(10_000_000);
    expect(result.newRcAccumulatedIncome).toBe(3_000_000);
    expect(result.breakdown).toEqual([{ rate: 13, amount: 1_690_000 }]);
  });

  it("пересечение порога 5 млн в базе РК: 13% + 15%", () => {
    // В базе РК накоплено 4,9 млн; часть РК выплаты 200 000 ₽.
    const result = calculateNdflForPayment(100_000_000, 0, 2026, {
      rcKop: 20_000_000,
      previousRcAccumulatedKop: 490_000_000,
    });

    // База РК: 100 000 × 13% + 100 000 × 15% = 28 000.
    // Основная база: 800 000 × 13% = 104 000.
    expect(result.ndfl).toBe(13_200_000);
    expect(result.newRcAccumulatedIncome).toBe(510_000_000);
    expect(result.breakdown).toEqual([
      { rate: 13, amount: 11_700_000 },
      { rate: 15, amount: 1_500_000 },
    ]);
  });

  it("2024: отдельная база не применяется, часть РК по общей шкале", () => {
    // gross 130 000 ₽, накоплено 4,9 млн – вся сумма по шкале 2024.
    const result = calculateNdflForPayment(13_000_000, 490_000_000, 2024, {
      rcKop: 3_000_000,
    });

    expect(result.ndfl).toBe(1_750_000);
    expect(result.newRcAccumulatedIncome).toBe(0);
  });

  it("выплаты из среднего заработка: 2025 – общая шкала, 2026 – отдельная база", () => {
    // gross 100 000 ₽, часть РК 23 076,92 ₽ (30/130).
    const rcKop = 2_307_692;

    const y2025 = calculateNdflForPayment(10_000_000, 0, 2025, {
      rcKop,
      rcBaseFromYear: 2026,
    });
    expect(y2025.ndfl).toBe(1_300_000);
    expect(y2025.newAccumulatedIncome).toBe(10_000_000);
    expect(y2025.newRcAccumulatedIncome).toBe(0);

    const y2026 = calculateNdflForPayment(10_000_000, 0, 2026, {
      rcKop,
      rcBaseFromYear: 2026,
    });
    expect(y2026.ndfl).toBe(1_300_000);
    expect(y2026.newAccumulatedIncome).toBe(7_692_308);
    expect(y2026.newRcAccumulatedIncome).toBe(2_307_692);
  });
});

describe("regional-coefficient: РК на премиях и доплатах", () => {
  function buildInput() {
    const year = 2026;
    const bonus: Bonus = {
      id: "b1",
      date: localDate(year, 3, 15),
      amount: 50_000 * 100,
      type: "custom",
    };
    const surcharge: SurchargeChange = {
      id: "s1",
      effectiveDate: localDate(year, 1, 1),
      amount: 10_000 * 100,
    };

    const calendarsByYear = new Map<number, CalendarData>();
    calendarsByYear.set(year, loadCalendar(year));

    return {
      settings: {
        advancePaymentDay: 15,
        salaryPaymentDay: 30,
        distribution: "by-worked-days",
        salaryChanges: [
          {
            id: "1",
            effectiveDate: localDate(year, 1, 1),
            amount: 100_000 * 100,
          },
        ],
      } as SalaryCalculationSettings,
      bonuses: [bonus],
      surcharges: [surcharge],
      regionalCoefficients: [
        {
          id: "rc1",
          effectiveDate: localDate(year, 1, 1),
          percent: 30,
        },
      ] as RegionalCoefficientChange[],
      vacations: [] as Vacation[],
      sickLeaves: [] as SickLeave[],
      sickLeaveSettings: {
        enableTopUp: false,
        topUpDaysLimitPerYear: 20,
      } as SickLeaveSettings,
      calendarsByYear,
    };
  }

  it("премия увеличивается на коэффициент", () => {
    const payments = calculateAll(buildInput());
    const bonusPayment = payments.find((p) => p.type === "bonus");

    expect(bonusPayment).toBeDefined();
    // 50 000 × 1.30 = 65 000 ₽.
    expect(bonusPayment!.gross).toBe(6_500_000);
    expect(bonusPayment!.regionalCoefficientPercent).toBe(30);
  });

  it("доплата увеличивается на коэффициент", () => {
    const payments = calculateAll(buildInput());
    const marchSurcharge = payments.find(
      (p) => p.type === "surcharge" && p.month === 3,
    );

    expect(marchSurcharge).toBeDefined();
    // 10 000 × 1.30 = 13 000 ₽ (небольшой дрейф от подневного округления).
    expect(Math.abs(marchSurcharge!.gross - 1_300_000)).toBeLessThan(20);
  });

  it("часть РК премии попадает в отдельную базу", () => {
    const payments = calculateAll(buildInput());
    const bonusPayment = payments.find((p) => p.type === "bonus")!;

    // Часть РК премии = 65 000 × 30/130 = 15 000 ₽, вся выплата в пределах
    // первой ставки: НДФЛ = 13% от gross.
    expect(bonusPayment.ndfl).toBe(845_000);
    // Накопленная часть РК пропорциональна накопленному gross:
    // ytdRc ≈ ytdGross × 30/130.
    const expectedRcYtd =
      (bonusPayment.yearToDateGross * 30) / 130;
    expect(
      Math.abs(bonusPayment.yearToDateRcGross! - expectedRcYtd),
    ).toBeLessThan(50);
  });
});

describe("regional-coefficient: часть РК отпускных (2026)", () => {
  it("отпускные включают долю РК дохода расчётного периода", () => {
    const calendarsByYear = new Map<number, CalendarData>();
    calendarsByYear.set(2025, loadCalendar(2025));
    calendarsByYear.set(2026, loadCalendar(2026));

    const vacation: Vacation = {
      id: "v1",
      startDate: localDate(2026, 3, 2),
      calendarDays: 14,
      dates: Array.from({ length: 14 }, (_, i) =>
        localDate(2026, 3, 2).add({ days: i }),
      ),
      type: "paid",
    };

    const payments = calculateAll({
      settings: {
        advancePaymentDay: 15,
        salaryPaymentDay: 30,
        distribution: "by-worked-days",
        salaryChanges: [
          {
            id: "1",
            effectiveDate: localDate(2025, 1, 1),
            amount: 100_000 * 100,
          },
        ],
      } as SalaryCalculationSettings,
      bonuses: [],
      surcharges: [],
      regionalCoefficients: [
        {
          id: "rc1",
          effectiveDate: localDate(2025, 1, 1),
          percent: 30,
        },
      ],
      vacations: [vacation],
      sickLeaves: [],
      sickLeaveSettings: {
        enableTopUp: false,
        topUpDaysLimitPerYear: 20,
      },
      calendarsByYear,
    });

    const vacationPayment = payments.find((p) => p.type === "vacation");
    expect(vacationPayment).toBeDefined();

    // Весь доход 2026 рассчитан с коэффициентом 30% – накопленная часть РК
    // пропорциональна накопленному gross: ytdRc ≈ ytdGross × 30/130.
    const expectedRcYtd = (vacationPayment!.yearToDateGross * 30) / 130;
    expect(
      Math.abs(vacationPayment!.yearToDateRcGross! - expectedRcYtd),
    ).toBeLessThan(50);

    // К дате отпускных (конец февраля) основной доход ≈ 150 000 ₽ – в пределах
    // первой ставки: и основная часть, и часть РК облагаются 13%.
    expect(
      Math.abs(
        vacationPayment!.ndfl - Math.round((vacationPayment!.gross * 13) / 100),
      ),
    ).toBeLessThan(2);
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

import { describe, it, expect } from "vitest";
import {
  calculateVacationPayment,
  getIncomeForPeriod,
  type IncomeRecord,
} from "@/features/payments/model/calculation/vacation";
import { AVG_MONTH_DAYS } from "@/features/payments/model/calculation/types";
import { localDate, type LocalDate } from "@/shared/types/local-date";
import type {
  Payment,
  SalaryCalculationSettings,
  Vacation,
} from "@/shared/types";
import { loadCalendar, loadCalendars } from "./fixtures/calendars";
import {
  PaymentsApplicationService,
  type PaymentCalculationInput,
} from "@/features/payments/model/PaymentsApplicationService";
import { InMemoryRepository } from "./fixtures/InMemoryRepository";

function inc(
  accrual: LocalDate,
  grossKop: number,
  factKop?: number,
): IncomeRecord {
  return { type: "salary", accrualDate: accrual, grossKop, factKop };
}

function paidVac(
  id: string,
  start: LocalDate,
  days: number,
  startCursor: LocalDate = start,
): Vacation {
  return {
    id,
    startDate: start,
    calendarDays: days,
    dates: Array.from({ length: days }, (_, i) => startCursor.add({ days: i })),
    type: "paid",
  };
}

// ─── getIncomeForPeriod: точные границы полуинтервала [from, to) ──────────────

describe("getIncomeForPeriod — границы периода", () => {
  const from = localDate(2024, 3, 1);
  const to = localDate(2025, 3, 1);

  it("нижняя граница включительно, верхняя исключительно (по месяцу начисления)", () => {
    const records = [
      inc(localDate(2024, 2, 1), 100), // месяц до периода → нет
      inc(localDate(2024, 3, 1), 100), // ровно from → да
      inc(localDate(2024, 12, 1), 100), // середина → да
      inc(localDate(2025, 2, 1), 100), // последний месяц периода → да
      inc(localDate(2025, 3, 1), 100), // ровно to (месяц отпуска) → нет
      inc(localDate(2025, 4, 1), 100), // после периода → нет
    ];
    expect(getIncomeForPeriod(from, to, records)).toBe(300);
  });

  it("factKop переопределяет grossKop (включая факт = 0)", () => {
    expect(
      getIncomeForPeriod(from, to, [inc(localDate(2024, 6, 1), 100, 250)]),
    ).toBe(250);
    // факт 0 ₽ означает «фактически получено 0» → 0, а не план
    expect(
      getIncomeForPeriod(from, to, [inc(localDate(2024, 6, 1), 100, 0)]),
    ).toBe(0);
  });

  it("пустой список даёт 0", () => {
    expect(getIncomeForPeriod(from, to, [])).toBe(0);
  });
});

// ─── calculateVacationPayment: выбор расчётного периода ───────────────────────

const cal2025 = loadCalendar(2025);
const INCOME_PER_MONTH = 100_000 * 100; // 100 000 ₽ в копейках

describe("calculateVacationPayment — выбор периода и СДЗ", () => {
  it("отпуск март 2025: период [мар2024, фев2025], доходы вне периода игнорируются", () => {
    const vac = paidVac("v", localDate(2025, 3, 3), 14);
    // 12 месяцев в периоде: мар2024 … фев2025
    const inPeriod: IncomeRecord[] = Array.from({ length: 12 }, (_, i) =>
      inc(localDate(2024, 3, 1).add({ months: i }), INCOME_PER_MONTH),
    );
    // приманки вне периода — не должны попасть в расчёт
    const decoys: IncomeRecord[] = [
      inc(localDate(2024, 2, 1), 99_000_000), // до периода
      inc(localDate(2025, 3, 1), 99_000_000), // месяц отпуска
      inc(localDate(2025, 4, 1), 99_000_000), // после
    ];

    const res = calculateVacationPayment(vac, [vac], 2025, cal2025, [
      ...inPeriod,
      ...decoys,
    ]);

    const includedDays = 12 * AVG_MONTH_DAYS; // отпуск вне периода → дни полные
    const expected = Math.round(
      ((12 * INCOME_PER_MONTH) / includedDays) * 14,
    );
    expect(res!.grossKop).toBe(expected);
  });

  it("отпуск январь 2025: период целиком в 2024 (пересечение границы года)", () => {
    const vac = paidVac("vjan", localDate(2025, 1, 13), 7);
    // период [янв2024, дек2024]: 12 месяцев 2024 года
    const inPeriod: IncomeRecord[] = Array.from({ length: 12 }, (_, i) =>
      inc(localDate(2024, 1, 1).add({ months: i }), INCOME_PER_MONTH),
    );
    const decoys: IncomeRecord[] = [
      inc(localDate(2023, 12, 1), 99_000_000), // до периода
      inc(localDate(2025, 1, 1), 99_000_000), // месяц отпуска
    ];

    const res = calculateVacationPayment(vac, [vac], 2025, cal2025, [
      ...inPeriod,
      ...decoys,
    ]);

    const includedDays = 12 * AVG_MONTH_DAYS;
    const expected = Math.round(((12 * INCOME_PER_MONTH) / includedDays) * 7);
    expect(res!.grossKop).toBe(expected);
  });

  it("прошлый отпуск в феврале 2024 (високосный, 29 дн) уменьшает includedDays", () => {
    // Отпуск в январе 2025 → период [янв2024, дек2024], фев 2024 (29 дн) внутри
    const vac = paidVac("v2", localDate(2025, 1, 13), 7);
    // прошлый отпуск: 10 календарных дней в фев 2024
    const prior = paidVac("prior", localDate(2024, 2, 5), 10);

    const income: IncomeRecord[] = Array.from({ length: 12 }, (_, i) =>
      inc(localDate(2024, 1, 1).add({ months: i }), INCOME_PER_MONTH),
    );

    const res = calculateVacationPayment(
      vac,
      [vac, prior],
      2025,
      cal2025,
      income,
    );

    // 11 полных месяцев + фев2024 пропорционально: 29 кал. дней, 10 под отпуском
    const febDays = (AVG_MONTH_DAYS / 29) * (29 - 10);
    const includedDays = 11 * AVG_MONTH_DAYS + febDays;
    const expected = Math.round(((12 * INCOME_PER_MONTH) / includedDays) * 7);
    expect(res!.grossKop).toBe(expected);
  });

  it("неоплачиваемый отпуск возвращает null", () => {
    const unpaid: Vacation = {
      ...paidVac("u", localDate(2025, 3, 3), 14),
      type: "unpaid",
    };
    expect(
      calculateVacationPayment(unpaid, [unpaid], 2025, cal2025, []),
    ).toBeNull();
  });

  it("нет дохода в периоде → null", () => {
    const vac = paidVac("v0", localDate(2025, 3, 3), 14);
    expect(calculateVacationPayment(vac, [vac], 2025, cal2025, [])).toBeNull();
  });
});

// ─── Отпуск через границу года (интеграция через сервис) ──────────────────────

describe("Отпуск через границу года", () => {
  it("две выплаты за разные годы используют один период (привязка к месяцу начала)", async () => {
    const settings: SalaryCalculationSettings = {
      advancePaymentDay: 23,
      salaryPaymentDay: 8,
      distribution: "by-worked-days",
      salaryChanges: [
        {
          id: "s",
          effectiveDate: localDate(2024, 1, 1),
          amount: 100_000 * 100,
        },
      ],
    };
    // 29 дек 2025 — 4 янв 2026 (7 дней), начало в декабре → период [дек2024, ноя2025]
    const vac = paidVac("vcross", localDate(2025, 12, 29), 7);
    const repo = new InMemoryRepository<Payment>([]);
    const svc = new PaymentsApplicationService(repo);
    const input: PaymentCalculationInput = {
      settings,
      bonuses: [],
      surcharges: [],
      vacations: [vac],
      sickLeaves: [],
      sickLeaveSettings: { enableTopUp: false, topUpDaysLimitPerYear: 30 },
      calendars: loadCalendars(2024, 2025, 2026),
    };

    const payments = await svc.recalculate(input);
    const vacPays = payments.filter(
      (p) => p.sourceId === "vcross" && p.type === "vacation",
    );

    // По одной выплате на каждый затронутый год
    expect(vacPays.length).toBe(2);
    const p2025 = vacPays.find((p) => p.date.year <= 2025)!;
    const p2026 = vacPays.find((p) => p.date.year >= 2026 || p.date.month <= 1);

    expect(vacPays.every((p) => p.gross > 0)).toBe(true);

    // 3 дня в 2025 (29,30,31) + 4 дня в 2026 (1-4): СДЗ одинаков → gross/день совпадает
    const byDays = [...vacPays].sort((a, b) => a.gross - b.gross);
    const small = byDays[0]!; // 3 дня
    const large = byDays[1]!; // 4 дня
    expect(Math.abs(small.gross / 3 - large.gross / 4)).toBeLessThan(1);
    void p2025;
    void p2026;
  });
});

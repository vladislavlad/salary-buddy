import { describe, it, expect } from "vitest";
import {
  buildSalaryEvents,
  addBonusEvents,
  stabilizeVacations,
  calculateSickLeavePhase,
  buildPaymentsWithNdfl,
} from "@/features/payments/model/calculation";
import type { RawEvent } from "@/features/payments/model/calculation";
import { sortSalaryChanges } from "@/features/payments/model/calculation/salary";
import type {
  SalaryCalculationSettings,
  Bonus,
} from "@/shared/types";
import { localDate as ld } from "@/shared/types/local-date";
import { loadCalendars } from "@/__tests__/fixtures/calendars.ts";

describe("buildSalaryEvents", () => {
  function makeSettings(): SalaryCalculationSettings {
    return {
      advancePaymentDay: 15,
      salaryPaymentDay: 30,
      distribution: "by-worked-days",
      salaryChanges: [
        { id: "1", effectiveDate: ld(2025, 1, 1), amount: 100_000 * 100 },
      ],
    };
  }

  it("генерирует события аванс и зарплата для каждого месяца с календарём", () => {
    const settings = makeSettings();
    const sortedChanges = sortSalaryChanges(settings.salaryChanges);
    const { events, paymentDatesByMonth } = buildSalaryEvents({
      settings,
      sortedChanges,
      sortedSurchargeChanges: [],
      vacations: [],
      sickLeaves: [],
      calendarsByYear: loadCalendars(2025),
      minYear: 2025,
      maxYear: 2025,
    });

    // По 2 события (аванс + зарплата) на каждый месяц = 24
    expect(events.length).toBe(24);

    const advances = events.filter((e) => e.type === "advance");
    const salaries = events.filter((e) => e.type === "salary");
    expect(advances.length).toBe(12);
    expect(salaries.length).toBe(12);

    // paymentDatesByMonth содержит даты для каждого месяца
    expect(paymentDatesByMonth.size).toBe(12);
  });

  it("не генерирует события без календаря за год", () => {
    const settings = makeSettings();
    const sortedChanges = sortSalaryChanges(settings.salaryChanges);
    const { events } = buildSalaryEvents({
      settings,
      sortedChanges,
      sortedSurchargeChanges: [],
      vacations: [],
      sickLeaves: [],
      calendarsByYear: new Map(),
      minYear: 2025,
      maxYear: 2025,
    });

    expect(events.length).toBe(0);
  });
});

describe("addBonusEvents", () => {
  function makeSortedChanges() {
    return sortSalaryChanges([
      { id: "1", effectiveDate: ld(2025, 1, 1), amount: 100_000 * 100 },
    ]);
  }

  it("добавляет событие для custom премии в диапазоне лет", () => {
    const bonus: Bonus = {
      id: "b1",
      date: ld(2025, 6, 15),
      amount: 50_000 * 100,
      type: "custom",
    };

    const events: RawEvent[] = [];
    addBonusEvents([bonus], makeSortedChanges(), undefined, events, 2025, 2025);

    expect(events.length).toBe(1);
    expect(events[0]!.type).toBe("bonus");
    expect(events[0]!.grossKop).toBe(50_000 * 100);
  });

  it("добавляет событие для salaries премии (количество окладов)", () => {
    const bonus: Bonus = {
      id: "b2",
      date: ld(2025, 3, 1),
      amount: 2,
      type: "salaries",
    };

    const events: RawEvent[] = [];
    addBonusEvents([bonus], makeSortedChanges(), undefined, events, 2025, 2025);

    expect(events.length).toBe(1);
    // gross = amount * salaryOnDateKop = 2 * 10_000_000 kop
    expect(events[0]!.grossKop).toBe(2 * 100_000 * 100);
    expect(events[0]!.salaryAmountKop).toBe(100_000 * 100);
  });

  it("пропускает salaries премию при окладе 0", () => {
    const bonus: Bonus = {
      id: "b3",
      date: ld(2024, 6, 1),
      amount: 1,
      type: "salaries",
    };

    // Оклад начинается с 2025 — в 2024 оклад = 0
    const sortedChanges = sortSalaryChanges([
      { id: "1", effectiveDate: ld(2025, 1, 1), amount: 100_000 * 100 },
    ]);

    const events: RawEvent[] = [];
    addBonusEvents([bonus], sortedChanges, undefined, events, 2024, 2025);

    expect(events.length).toBe(0);
  });

  it("пропускает премию вне диапазона minYear/maxYear", () => {
    const bonus: Bonus = {
      id: "b4",
      date: ld(2026, 1, 1),
      amount: 10_000 * 100,
      type: "custom",
    };

    const events: RawEvent[] = [];
    addBonusEvents([bonus], makeSortedChanges(), undefined, events, 2025, 2025);

    expect(events.length).toBe(0);
  });
});

describe("stabilizeVacations", () => {
  it("возвращает события без изменений при пустых отпусках", () => {
    const events: RawEvent[] = [
      {
        sourceId: "sal:2025:01:a",
        date: ld(2025, 1, 15),
        type: "advance",
        grossKop: 5_000_000,
        salaryAmountKop: 100_000 * 100,
        accrualDate: ld(2025, 1, 1),
      },
    ];

    const result = stabilizeVacations({
      events,
      vacations: [],
      calendarsByYear: loadCalendars(2025),
      factBySource: new Map(),
      minYear: 2025,
      maxYear: 2025,
    });

    expect(result).toEqual(events);
  });

  it("не мутирует входной массив событий", () => {
    const events: RawEvent[] = [
      {
        sourceId: "sal:2025:01:a",
        date: ld(2025, 1, 15),
        type: "advance",
        grossKop: 5_000_000,
        salaryAmountKop: 100_000 * 100,
        accrualDate: ld(2025, 1, 1),
      },
    ];

    const inputRef = events[0]!;
    stabilizeVacations({
      events,
      vacations: [],
      calendarsByYear: loadCalendars(2025),
      factBySource: new Map(),
      minYear: 2025,
      maxYear: 2025,
    });

    // Входной массив не мутирован — элементы те же, длина та же
    expect(events.length).toBe(1);
    expect(events[0]).toBe(inputRef);
  });
});

describe("calculateSickLeavePhase", () => {
  it("возвращает события без изменений при пустых больничных", () => {
    const events: RawEvent[] = [
      {
        sourceId: "sal:2025:01:a",
        date: ld(2025, 1, 15),
        type: "advance",
        grossKop: 5_000_000,
        salaryAmountKop: 100_000 * 100,
        accrualDate: ld(2025, 1, 1),
      },
    ];

    const sortedChanges = sortSalaryChanges([
      { id: "1", effectiveDate: ld(2025, 1, 1), amount: 100_000 * 100 },
    ]);

    const result = calculateSickLeavePhase({
      events,
      sickLeaves: [],
      sickLeaveSettings: undefined,
      calendarsByYear: loadCalendars(2025),
      sortedChanges,
      paymentDatesByMonth: new Map(),
      factBySource: new Map(),
    });

    expect(result.length).toBe(events.length);
    expect(result.every((e) => !e.type.startsWith("sick-leave"))).toBe(true);
  });
});

describe("buildPaymentsWithNdfl", () => {
  it("применяет НДФЛ к событиям и возвращает платежи", () => {
    const events: RawEvent[] = [
      {
        sourceId: "sal:2025:01:a",
        date: ld(2025, 1, 15),
        type: "advance",
        grossKop: 5_000_000,
        salaryAmountKop: 100_000 * 100,
        accrualDate: ld(2025, 1, 1),
      },
    ];

    const payments = buildPaymentsWithNdfl({
      events,
      existingPayments: [],
      recalcFrom: undefined,
      factBySource: new Map(),
      minYear: 2025,
    });

    expect(payments.length).toBe(1);
    const payment = payments[0]!;
    expect(payment.type).toBe("advance");
    expect(payment.gross).toBe(5_000_000);
    // НДФЛ 13% от gross
    expect(payment.ndfl).toBeGreaterThan(0);
    expect(payment.net).toBe(payment.gross - payment.ndfl);
  });

  it("использует fact из factBySource вместо grossKop для расчёта НДФЛ", () => {
    const events: RawEvent[] = [
      {
        sourceId: "sal:2025:01:a",
        date: ld(2025, 1, 15),
        type: "advance",
        grossKop: 5_000_000,
        salaryAmountKop: 100_000 * 100,
        accrualDate: ld(2025, 1, 1),
      },
    ];

    const factBySource = new Map<string, number>();
    factBySource.set("sal:2025:01:a", 4_000_000);

    const payments = buildPaymentsWithNdfl({
      events,
      existingPayments: [],
      recalcFrom: undefined,
      factBySource,
      minYear: 2025,
    });

    expect(payments.length).toBe(1);
    const payment = payments[0]!;
    // gross остаётся расчётным, но net рассчитан по факту
    expect(payment.gross).toBe(5_000_000);
    // effectiveGrossKop = factBySource.get(sourceId) = 4_000_000
    const expectedNdfl = Math.floor(4_000_000 * 13 / 100);
    expect(payment.ndfl).toBe(expectedNdfl);
    expect(payment.net).toBe(4_000_000 - expectedNdfl);
  });

  it("сохраняет платежи до recalcFrom из existingPayments", () => {
    const preRecalcPayment = {
      id: "pre-1",
      sourceId: "sal:2024:12:b",
      date: ld(2024, 12, 30),
      type: "salary" as const,
      salaryAmount: 100_000 * 100,
      gross: 5_000_000,
      ndfls: [],
      ndfl: 650_000,
      net: 4_350_000,
      yearToDateGross: 20_000_000,
    };

    const events: RawEvent[] = [
      {
        sourceId: "sal:2025:03:a",
        date: ld(2025, 3, 15),
        type: "advance",
        grossKop: 5_000_000,
        salaryAmountKop: 100_000 * 100,
        accrualDate: ld(2025, 3, 1),
      },
    ];

    const payments = buildPaymentsWithNdfl({
      events,
      existingPayments: [preRecalcPayment],
      recalcFrom: ld(2025, 2, 1),
      factBySource: new Map(),
      minYear: 2024,
    });

    // Первый — сохранённый до recalcFrom, второй — пересчитанный
    expect(payments.length).toBe(2);
    expect(payments[0]!.id).toBe("pre-1");
    expect(payments[1]!.type).toBe("advance");
  });

  it("пропускает события до recalcFrom", () => {
    const events: RawEvent[] = [
      {
        sourceId: "sal:2025:01:a",
        date: ld(2025, 1, 15),
        type: "advance",
        grossKop: 5_000_000,
        salaryAmountKop: 100_000 * 100,
        accrualDate: ld(2025, 1, 1),
      },
    ];

    const payments = buildPaymentsWithNdfl({
      events,
      existingPayments: [],
      recalcFrom: ld(2025, 2, 1),
      factBySource: new Map(),
      minYear: 2025,
    });

    expect(payments.length).toBe(0);
  });
});

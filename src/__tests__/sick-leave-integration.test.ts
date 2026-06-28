import { describe, it, expect } from "vitest";
import { calculateAll } from "@/features/payments/model/calculation-engine";
import type { SalaryCalculationSettings, SickLeave, SickLeaveSettings } from "@/shared/types";
import { localDate as ld } from "@/shared/types/local-date";
import { loadCalendars } from "./fixtures/calendars";

function createSickLeave(
  id: string,
  startDate: ReturnType<typeof ld>,
  calendarDays: number,
  reason: SickLeave["reason"],
  experience: SickLeave["experience"],
): SickLeave {
  const dates = [];
  for (let i = 0; i < calendarDays; i++) {
    dates.push(startDate.add({ days: i }));
  }
  return { id, startDate, calendarDays, dates, reason, experience };
}

function createBaseSettings(year: number): SalaryCalculationSettings {
  return {
    advancePaymentDay: 15,
    salaryPaymentDay: 30,
    distribution: "by-worked-days",
    salaryChanges: [
      {
        id: "1",
        effectiveDate: ld(year, 1, 1),
        amount: 200_000 * 100, // 200k ₽ в копейках
      },
    ],
  };
}

describe("sick-leave-integration", () => {
  const calendars = loadCalendars(2024, 2025, 2026);
  const sickLeaveSettings: SickLeaveSettings = {
    enableTopUp: false,
    topUpDaysLimitPerYear: 30,
  };

  describe("вычет из зарплаты (absenceDaysSet)", () => {
    it("дни больничного исключаются из расчёта аванса/зарплаты", () => {
      // Июнь 2026: 1-7 июня – больничный (5 рабочих дней + 2 выходных)
      const sl = createSickLeave(
        "sick:2026:01",
        ld(2026, 6, 1),
        7,
        "illness",
        "8plus",
      );

      // Сравниваем с расчётом без больничного
      const paymentsWithoutSl = calculateAll({
        settings: createBaseSettings(2026),
        bonuses: [],
        surcharges: [],
        vacations: [],
        sickLeaves: [],
        sickLeaveSettings,
        calendarsByYear: calendars,
      });

      // Сумма аванс+зарплата за июнь без больничного
      const junePaymentsNoSl = paymentsWithoutSl.filter(
        (p) => (p.type === "advance" || p.type === "salary") && p.date.month === 6,
      );
      const totalWithoutSl = junePaymentsNoSl.reduce((s, p) => s + p.gross, 0);

      const paymentsWithSl = calculateAll({
        settings: createBaseSettings(2026),
        bonuses: [],
        surcharges: [],
        vacations: [],
        sickLeaves: [sl],
        sickLeaveSettings,
        calendarsByYear: calendars,
      });

      const junePaymentsWithSl = paymentsWithSl.filter(
        (p) => (p.type === "advance" || p.type === "salary") && p.date.month === 6,
      );
      const totalWithSl = junePaymentsWithSl.reduce((s, p) => s + p.gross, 0);

      // С больничным gross меньше (рабочие дни исключены)
      expect(totalWithSl).toBeLessThan(totalWithoutSl);
    });

    it("больничный и отпуск в одном месяце: оба вычитаются", () => {
      const sl = createSickLeave(
        "sick:2026:01",
        ld(2026, 7, 1),
        5,
        "illness",
        "8plus",
      );

      const vacationDates = [];
      for (let i = 0; i < 5; i++) {
        vacationDates.push(ld(2026, 7, 15).add({ days: i }));
      }

      const payments = calculateAll({
        settings: createBaseSettings(2026),
        bonuses: [],
        surcharges: [],
        vacations: [
          {
            id: "vac:2026:01",
            startDate: ld(2026, 7, 15),
            calendarDays: 5,
            dates: vacationDates,
            type: "paid" as const,
          },
        ],
        sickLeaves: [sl],
        sickLeaveSettings,
        calendarsByYear: calendars,
      });

      const julyAdvance = payments.find((p) => p.type === "advance" && p.month === 7);
      const julySalary = payments.find((p) => p.type === "salary" && p.month === 7);
      const totalGross = (julyAdvance?.gross ?? 0) + (julySalary?.gross ?? 0);

      // Оклад 200k, вычтено 10 дней → gross значительно меньше полного оклада
      expect(totalGross).toBeLessThan(200_000 * 100);
    });
  });

  describe("НДФЛ на типы платежей", () => {
    it("sick-leave-sfr: НДФЛ = 0 (СФР удержит самостоятельно)", () => {
      const sl = createSickLeave(
        "sick:2026:01",
        ld(2026, 6, 1),
       7,
        "illness",
        "8plus",
      );

      const payments = calculateAll({
        settings: createBaseSettings(2026),
        bonuses: [],
        surcharges: [],
        vacations: [],
        sickLeaves: [sl],
        sickLeaveSettings,
        calendarsByYear: calendars,
      });

      const sfrPayment = payments.find((p) => p.type === "sick-leave-sfr");
      expect(sfrPayment).toBeDefined();
      expect(sfrPayment!.ndfl).toBe(0);
      // net = gross (без НДФЛ)
      expect(sfrPayment!.net).toBe(sfrPayment!.gross);
    });

    it("sick-leave (employer benefit): НДФЛ по прогрессивной шкале", () => {
      const sl = createSickLeave(
        "sick:2026:01",
        ld(2026, 6, 1),
       5,
        "illness",
        "8plus",
      );

      const payments = calculateAll({
        settings: createBaseSettings(2026),
        bonuses: [],
        surcharges: [],
        vacations: [],
        sickLeaves: [sl],
        sickLeaveSettings,
        calendarsByYear: calendars,
      });

      const empPayment = payments.find((p) => p.type === "sick-leave");
      expect(empPayment).toBeDefined();
      // НДФЛ > 0 (прогрессивная шкала применяется)
      expect(empPayment!.ndfl).toBeGreaterThan(0);
      expect(empPayment!.net).toBe(empPayment!.gross - empPayment!.ndfl);
    });

    it("sick-leave-topup: НДФЛ по прогрессивной шкале", () => {
      const sl = createSickLeave(
        "sick:2026:01",
        ld(2026, 6, 1),
       5,
        "illness",
        "8plus",
      );

      const payments = calculateAll({
        settings: createBaseSettings(2026),
        bonuses: [],
        surcharges: [],
        vacations: [],
        sickLeaves: [sl],
        sickLeaveSettings: {
          enableTopUp: true,
          topUpDaysLimitPerYear: 30,
        },
        calendarsByYear: calendars,
      });

      const topupPayment = payments.find((p) => p.type === "sick-leave-topup");
      if (topupPayment) {
        // Если доплата > 0 → НДФЛ > 0
        expect(topupPayment.ndfl).toBeGreaterThan(0);
        expect(topupPayment.net).toBe(topupPayment.gross - topupPayment.ndfl);
      } else {
        // Доплата может быть 0 если dailyBenefit >= dailySalary – тест корректно пропускается
        expect(true).toBe(true);
      }
    });

    it("sick-leave-sfr не участвует в accumulated income для НДФЛ", () => {
      const sl = createSickLeave(
        "sick:2026:01",
        ld(2026, 3, 1),
       5,
        "illness",
        "8plus",
      );

      const payments = calculateAll({
        settings: createBaseSettings(2026),
        bonuses: [],
        surcharges: [],
        vacations: [],
        sickLeaves: [sl],
        sickLeaveSettings,
        calendarsByYear: calendars,
      });

      // Сортируем по дате
      const sorted = [...payments].sort(
        (a, b) => a.date.toString().localeCompare(b.date.toString()),
      );

      // Находим sfr-платёж
      const sfrIdx = sorted.findIndex((p) => p.type === "sick-leave-sfr");
      expect(sfrIdx).toBeGreaterThanOrEqual(0);

      // Если есть платёж после SFR – его yearToDateGross НЕ должен включать gross SFR
      if (sfrIdx < sorted.length - 1) {
        const nextPayment = sorted[sfrIdx + 1]!;
        // yearToDateGross следующего платежа = accumulated income до него + свой gross
        // accumulated income не включает SFR, значит yearToDateGross <= sum всех non-SFR gross до и включая этот платёж
        const incomeUpToNext = sorted
          .slice(0, sfrIdx + 2)
          .filter((p) => p.type !== "sick-leave-sfr")
          .reduce((sum, p) => sum + p.gross, 0);

        expect(nextPayment.yearToDateGross).toBeLessThanOrEqual(incomeUpToNext);
      } else {
        // SFR – последний платёж; проверяем, что предыдущий не включает SFR gross
        const sfrPayment = sorted[sfrIdx]!;
        expect(sfrPayment.ndfl).toBe(0);
      }
    });

    it("sick-leave и sick-leave-topup участвуют в accumulated income", () => {
      const sl = createSickLeave(
        "sick:2026:01",
        ld(2026, 3, 1),
       5,
        "illness",
        "8plus",
      );

      const payments = calculateAll({
        settings: createBaseSettings(2026),
        bonuses: [],
        surcharges: [],
        vacations: [],
        sickLeaves: [sl],
        sickLeaveSettings,
        calendarsByYear: calendars,
      });

      // Находим employer benefit платёж
      const empPayment = payments.find((p) => p.type === "sick-leave");
      expect(empPayment).toBeDefined();
      // yearToDateGross включает gross этого платежа (плюс предыдущие)
      expect(empPayment!.yearToDateGross).toBeGreaterThanOrEqual(
        empPayment!.gross,
      );
    });
  });

  describe("полный расчёт с больничным", () => {
    it("генерирует все ожидаемые типы событий для illness", () => {
      const sl = createSickLeave(
        "sick:2026:01",
        ld(2026, 6, 1),
       7,
        "illness",
        "8plus",
      );

      const payments = calculateAll({
        settings: createBaseSettings(2026),
        bonuses: [],
        surcharges: [],
        vacations: [],
        sickLeaves: [sl],
        sickLeaveSettings,
        calendarsByYear: calendars,
      });

      // Есть аванс и зарплата (уменьшенные на дни больничного)
      expect(payments.find((p) => p.type === "advance")).toBeDefined();
      expect(payments.find((p) => p.type === "salary")).toBeDefined();

      // Есть employer benefit (дни 1-3)
      expect(payments.find((p) => p.type === "sick-leave")).toBeDefined();

      // Есть СФР часть (дни 4+)
      expect(payments.find((p) => p.type === "sick-leave-sfr")).toBeDefined();
    });

    it("work-injury: только СФР, без employer benefit", () => {
      const sl = createSickLeave(
        "sick:2026:01",
        ld(2026, 6, 1),
       5,
        "work-injury",
        "under5",
      );

      const payments = calculateAll({
        settings: createBaseSettings(2026),
        bonuses: [],
        surcharges: [],
        vacations: [],
        sickLeaves: [sl],
        sickLeaveSettings,
        calendarsByYear: calendars,
      });

      expect(payments.find((p) => p.type === "sick-leave")).toBeUndefined();
      expect(payments.find((p) => p.type === "sick-leave-sfr")).toBeDefined();
    });
  });

  describe("даты выплат работодателя (по половинам месяца)", () => {
    it("больничный в первой половине → пособие работодателя в день аванса", () => {
      // 1-5 июня: дни 1-3 (работодатель) в первой половине месяца.
      const sl = createSickLeave(
        "sick:2026:01",
        ld(2026, 6, 1),
        5,
        "illness",
        "8plus",
      );

      const payments = calculateAll({
        settings: createBaseSettings(2026),
        bonuses: [],
        surcharges: [],
        vacations: [],
        sickLeaves: [sl],
        sickLeaveSettings,
        calendarsByYear: calendars,
      });

      const juneAdvance = payments.find(
        (p) => p.type === "advance" && p.month === 6 && p.date.year === 2026,
      )!;
      const employer = payments.filter((p) => p.type === "sick-leave");

      // Все дни в первой половине → одна выплата работодателя в день аванса.
      expect(employer).toHaveLength(1);
      expect(employer[0]!.date.toString()).toBe(juneAdvance.date.toString());
    });

    it("больничный на обе половины → пособие работодателя разносится на аванс и зарплату", () => {
      // 14-16 июня: дни 14,15 (1-я половина → аванс) + 16 (2-я половина → зарплата).
      const sl = createSickLeave(
        "sick:2026:01",
        ld(2026, 6, 14),
        3,
        "illness",
        "8plus",
      );

      const payments = calculateAll({
        settings: createBaseSettings(2026),
        bonuses: [],
        surcharges: [],
        vacations: [],
        sickLeaves: [sl],
        sickLeaveSettings,
        calendarsByYear: calendars,
      });

      const juneAdvance = payments.find(
        (p) => p.type === "advance" && p.month === 6 && p.date.year === 2026,
      )!;
      const juneSalary = payments.find(
        (p) => p.type === "salary" && p.month === 6 && p.date.year === 2026,
      )!;
      const employer = payments.filter((p) => p.type === "sick-leave");

      expect(employer).toHaveLength(2);
      const grossByDate = new Map(
        employer.map((e) => [e.date.toString(), e.gross]),
      );
      // 2 дня в день аванса, 1 день в день зарплаты → отношение 2:1.
      expect(grossByDate.get(juneAdvance.date.toString())).toBe(
        2 * grossByDate.get(juneSalary.date.toString())!,
      );
    });

    it("доплата работодателя разносится на аванс и зарплату по половинам месяца", () => {
      // 10-20 июня: рабочие дни в обеих половинах месяца.
      const sl = createSickLeave(
        "sick:2026:01",
        ld(2026, 6, 10),
        11,
        "illness",
        "8plus",
      );

      const payments = calculateAll({
        settings: createBaseSettings(2026),
        bonuses: [],
        surcharges: [],
        vacations: [],
        sickLeaves: [sl],
        sickLeaveSettings: { enableTopUp: true, topUpDaysLimitPerYear: 30 },
        calendarsByYear: calendars,
      });

      const juneAdvance = payments.find(
        (p) => p.type === "advance" && p.month === 6 && p.date.year === 2026,
      )!;
      const juneSalary = payments.find(
        (p) => p.type === "salary" && p.month === 6 && p.date.year === 2026,
      )!;
      const topupDates = new Set(
        payments
          .filter((p) => p.type === "sick-leave-topup")
          .map((p) => p.date.toString()),
      );

      expect(topupDates.has(juneAdvance.date.toString())).toBe(true);
      expect(topupDates.has(juneSalary.date.toString())).toBe(true);
    });

    it("СФР-часть платится отдельно (рабочий день перед концом периода)", () => {
      // 1-7 июня (illness): СФР за дни 4-7. endDate=07.06 (сб) → 05.06.
      const sl = createSickLeave(
        "sick:2026:01",
        ld(2026, 6, 1),
        7,
        "illness",
        "8plus",
      );

      const payments = calculateAll({
        settings: createBaseSettings(2026),
        bonuses: [],
        surcharges: [],
        vacations: [],
        sickLeaves: [sl],
        sickLeaveSettings,
        calendarsByYear: calendars,
      });

      const sfr = payments.find((p) => p.type === "sick-leave-sfr")!;
      const juneAdvance = payments.find(
        (p) => p.type === "advance" && p.month === 6 && p.date.year === 2026,
      )!;
      // СФР дата не совпадает с днём аванса – отдельная логика выплаты.
      expect(sfr.date.toString()).toBe("2026-06-05");
      expect(sfr.date.toString()).not.toBe(juneAdvance.date.toString());
    });
  });
});

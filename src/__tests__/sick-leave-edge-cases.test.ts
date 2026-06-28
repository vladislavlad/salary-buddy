import { describe, it, expect } from "vitest";
import { calculateSickLeavePayments } from "@/features/payments/model/calculation/sick-leave";
import type { SickLeave, SickLeaveSettings } from "@/shared/types";
import type { IncomeRecord } from "@/features/payments/model/calculation/vacation";
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

const defaultSettings: SickLeaveSettings = {
  enableTopUp: false,
  topUpDaysLimitPerYear: 30,
};

describe("sick-leave-edge-cases", () => {
  const calendars = loadCalendars(2024, 2025, 2026);

  // Доход за 2024-2025 для СДЗ
  const incomeRecords2026: IncomeRecord[] = [
    { type: "salary", accrualDate: ld(2024, 6, 15), grossKop: 70_000_000 },
    { type: "salary", accrualDate: ld(2025, 3, 15), grossKop: 30_000_000 },
  ];

  // Доход за 2023-2024 для СДЗ при больничном в 2025
  const incomeRecords2025: IncomeRecord[] = [
    { type: "salary", accrualDate: ld(2023, 6, 15), grossKop: 70_000_000 },
    { type: "salary", accrualDate: ld(2024, 3, 15), grossKop: 30_000_000 },
  ];

  describe("кросс-год больничные", () => {
    it("illness: дни 1-3 в 2025, СФР с 4-го дня переходит в 2026", () => {
      // 30.12.2025 – 05.01.2026 (7 дней): 2 дня в 2025, 5 дней в 2026
      const dates = [];
      for (let i = 0; i < 7; i++) {
        dates.push(ld(2025, 12, 30).add({ days: i }));
      }
      const sl: SickLeave = {
        id: "sick:cross:01",
        startDate: ld(2025, 12, 30),
        calendarDays: 7,
        dates,
        reason: "illness",
        experience: "8plus",
      };

      const events = calculateSickLeavePayments(
        [sl],
        defaultSettings,
        calendars,
        incomeRecords2025, // база для СДЗ: 2023-2024
        100_000 * 100,
      );

      const avgDailyEarningsKop = Math.round(100_000_000 / 730);

      // 2025: дни 1-2 (работодатель, 2 дня) – СФР нет (день 4+ в 2026)
      const emp2025 = events.find((e) => e.type === "sick-leave" && e.sourceId.includes(":2025"));
      expect(emp2025).toBeDefined();
      expect(emp2025!.grossKop).toBe(2 * avgDailyEarningsKop);

      const sfr2025 = events.find((e) => e.type === "sick-leave-sfr" && e.sourceId.includes(":2025"));
      expect(sfr2025).toBeUndefined();

      // 2026: день 3 (работодатель) + дни 4-7 (СФР, 4 дня)
      const emp2026 = events.find((e) => e.type === "sick-leave" && e.sourceId.includes(":2026"));
      expect(emp2026).toBeDefined();
      expect(emp2026!.grossKop).toBe(avgDailyEarningsKop);

      const sfr2026 = events.find((e) => e.type === "sick-leave-sfr" && e.sourceId.includes(":2026"));
      expect(sfr2026).toBeDefined();
      expect(sfr2026!.grossKop).toBe(4 * avgDailyEarningsKop);
    });

    it("illness: все 3 дня работодателя в одном году, СФР – в другом", () => {
      // 29.12.2025 – 02.01.2026 (5 дней)
      const dates = [];
      for (let i = 0; i < 5; i++) {
        dates.push(ld(2025, 12, 29).add({ days: i }));
      }
      const sl: SickLeave = {
        id: "sick:cross:02",
        startDate: ld(2025, 12, 29),
        calendarDays: 5,
        dates,
        reason: "illness",
        experience: "8plus",
      };

      const events = calculateSickLeavePayments(
        [sl],
        defaultSettings,
        calendars,
        incomeRecords2025,
        100_000 * 100,
      );

      const avgDailyEarningsKop = Math.round(100_000_000 / 730);

      // 2025: дни 1-3 (работодатель) – все в одном году
      const emp2025 = events.find((e) => e.type === "sick-leave" && e.sourceId.includes(":2025"));
      expect(emp2025).toBeDefined();
      expect(emp2025!.grossKop).toBe(3 * avgDailyEarningsKop);

      // 2025: нет СФР (дни 1-3 – работодатель)
      const sfr2025 = events.find((e) => e.type === "sick-leave-sfr" && e.sourceId.includes(":2025"));
      expect(sfr2025).toBeUndefined();

      // 2026: дни 4-5 (СФР, 2 дня)
      const sfr2026 = events.find((e) => e.type === "sick-leave-sfr" && e.sourceId.includes(":2026"));
      expect(sfr2026).toBeDefined();
      expect(sfr2026!.grossKop).toBe(2 * avgDailyEarningsKop);
    });

    it("child-care-7to15: порог 10 дней пересекает год", () => {
      // 20.12.2025 – 05.01.2026 (17 дней)
      const dates = [];
      for (let i = 0; i < 17; i++) {
        dates.push(ld(2025, 12, 20).add({ days: i }));
      }
      const sl: SickLeave = {
        id: "sick:cross:03",
        startDate: ld(2025, 12, 20),
        calendarDays: 17,
        dates,
        reason: "child-care-7to15",
        experience: "8plus",
      };

      const events = calculateSickLeavePayments(
        [sl],
        defaultSettings,
        calendars,
        incomeRecords2025,
        100_000 * 100,
      );

      const avgDailyEarningsKop = Math.round(100_000_000 / 730);

      // 2025: дни 1-12 (все ≤ 10 → 100%, дни 11-12 → 50%)
      const sfr2025 = events.find((e) => e.type === "sick-leave-sfr" && e.sourceId.includes(":2025"));
      expect(sfr2025).toBeDefined();
      // Дни 1-10: 100%, дни 11-12: 50%
      const expected2025 = 10 * avgDailyEarningsKop + 2 * Math.round(avgDailyEarningsKop * 0.5);
      expect(sfr2025!.grossKop).toBe(expected2025);

      // 2026: дни 13-17 (все > 10 → 50%)
      const sfr2026 = events.find((e) => e.type === "sick-leave-sfr" && e.sourceId.includes(":2026"));
      expect(sfr2026).toBeDefined();
      expect(sfr2026!.grossKop).toBe(5 * Math.round(avgDailyEarningsKop * 0.5));

      // Нет employer benefit (child-care – СФР с 1 дня)
      expect(events.find((e) => e.type === "sick-leave")).toBeUndefined();
    });

    it("work-injury кросс-год: только СФР, 100% в обоих годах", () => {
      const dates = [];
      for (let i = 0; i < 6; i++) {
        dates.push(ld(2025, 12, 30).add({ days: i }));
      }
      const sl: SickLeave = {
        id: "sick:cross:04",
        startDate: ld(2025, 12, 30),
        calendarDays: 6,
        dates,
        reason: "work-injury",
        experience: "under5",
      };

      const events = calculateSickLeavePayments(
        [sl],
        defaultSettings,
        calendars,
        incomeRecords2025,
        100_000 * 100,
      );

      const avgDailyEarningsKop = Math.round(100_000_000 / 730);

      // 2025: 3 дня (30, 31.12 + 1.01? Нет – 30, 31 в 2025)
      const datesIn2025 = dates.filter((d) => d.year === 2025);
      const datesIn2026 = dates.filter((d) => d.year === 2026);

      const sfr2025 = events.find((e) => e.type === "sick-leave-sfr" && e.sourceId.includes(":2025"));
      expect(sfr2025!.grossKop).toBe(datesIn2025.length * avgDailyEarningsKop);

      const sfr2026 = events.find((e) => e.type === "sick-leave-sfr" && e.sourceId.includes(":2026"));
      expect(sfr2026!.grossKop).toBe(datesIn2026.length * avgDailyEarningsKop);

      // Стаж under5 не влияет – work-injury всегда 100%
      expect(events.find((e) => e.type === "sick-leave")).toBeUndefined();
    });
  });

  describe("доплата: кросс-год и лимиты", () => {
    const topUpSettings: SickLeaveSettings = {
      enableTopUp: true,
      topUpDaysLimitPerYear: 15,
    };

    it("лимит сбрасывается по годам: каждый год получает полный лимит", () => {
      // Больничный в 2025 (7 дней) и в 2026 (8 дней), лимит 15 на год
      const sl1 = createSickLeave(
        "sick:limit:01",
        ld(2025, 6, 1),
        7,
        "illness",
        "8plus",
      );
      const sl2 = createSickLeave(
        "sick:limit:02",
        ld(2026, 6, 1),
        8,
        "illness",
        "8plus",
      );

      // Объединяем доходы для обоих годов
      const allIncome: IncomeRecord[] = [
        ...incomeRecords2025,
        ...incomeRecords2026,
      ];

      const events = calculateSickLeavePayments(
        [sl1, sl2],
        topUpSettings,
        calendars,
        allIncome,
        100_000 * 100,
      );

      // Оба больничных в пределах лимита своего года (7 < 15 и 8 < 15)
      const topup2025 = events.find(
        (e) => e.type === "sick-leave-topup" && e.sourceId.includes("sick:limit:01"),
      );
      const topup2026 = events.find(
        (e) => e.type === "sick-leave-topup" && e.sourceId.includes("sick:limit:02"),
      );

      expect(topup2025).toBeDefined();
      expect(topup2026).toBeDefined();
    });

    it("кросс-год больничный: доплата считается отдельно по годам", () => {
      const dates = [];
      for (let i = 0; i < 10; i++) {
        dates.push(ld(2025, 12, 28).add({ days: i }));
      }
      const sl: SickLeave = {
        id: "sick:topup:cross",
        startDate: ld(2025, 12, 28),
        calendarDays: 10,
        dates,
        reason: "illness",
        experience: "8plus",
      };

      const events = calculateSickLeavePayments(
        [sl],
        topUpSettings,
        calendars,
        incomeRecords2025,
        100_000 * 100,
      );

      // Даты: 28-31.12.2025 (4 дня) + 01-04.01.2026 (6 дней)

      // Лимит 15 на год, дней в каждом году меньше лимита → доплата за все дни
      const topupEvents = events.filter((e) => e.type === "sick-leave-topup");
      expect(topupEvents.length).toBeGreaterThanOrEqual(1);

      // Сумма доплат по годам > 0 (если dailySalary > dailyBenefit)
      for (const te of topupEvents) {
        expect(te.grossKop).toBeGreaterThan(0);
      }
    });
  });

  describe("граничные случаи", () => {
    it("1 день больничного: illness → только работодатель", () => {
      const sl = createSickLeave(
        "sick:edge:01",
        ld(2026, 6, 1),
        1,
        "illness",
        "8plus",
      );

      const events = calculateSickLeavePayments(
        [sl],
        defaultSettings,
        calendars,
        incomeRecords2026,
        100_000 * 100,
      );

      const avgDailyEarningsKop = Math.round(100_000_000 / 730);

      // День 1 – работодатель
      const empEvent = events.find((e) => e.type === "sick-leave");
      expect(empEvent).toBeDefined();
      expect(empEvent!.grossKop).toBe(avgDailyEarningsKop);

      // СФР нет (день 1 < 4)
      expect(events.find((e) => e.type === "sick-leave-sfr")).toBeUndefined();
    });

    it("3 дня больничного: illness → все дни работодатель, СФР = 0", () => {
      const sl = createSickLeave(
        "sick:edge:02",
        ld(2026, 6, 1),
        3,
        "illness",
        "8plus",
      );

      const events = calculateSickLeavePayments(
        [sl],
        defaultSettings,
        calendars,
        incomeRecords2026,
        100_000 * 100,
      );

      const avgDailyEarningsKop = Math.round(100_000_000 / 730);

      const empEvent = events.find((e) => e.type === "sick-leave");
      expect(empEvent!.grossKop).toBe(3 * avgDailyEarningsKop);

      expect(events.find((e) => e.type === "sick-leave-sfr")).toBeUndefined();
    });

    it("4 дня больничного: illness → 3 работодателя + 1 СФР", () => {
      const sl = createSickLeave(
        "sick:edge:03",
        ld(2026, 6, 1),
        4,
        "illness",
        "8plus",
      );

      const events = calculateSickLeavePayments(
        [sl],
        defaultSettings,
        calendars,
        incomeRecords2026,
        100_000 * 100,
      );

      const avgDailyEarningsKop = Math.round(100_000_000 / 730);

      const empEvent = events.find((e) => e.type === "sick-leave");
      expect(empEvent!.grossKop).toBe(3 * avgDailyEarningsKop);

      const sfrEvent = events.find((e) => e.type === "sick-leave-sfr");
      expect(sfrEvent!.grossKop).toBe(avgDailyEarningsKop);
    });

    it("incomeRecords: factKop используется вместо grossKop при наличии", () => {
      const incomeWithFact: IncomeRecord[] = [
        {
          type: "salary",
          accrualDate: ld(2024, 6, 15),
          grossKop: 100_000_000,
          factKop: 80_000_000, // фактическая выплата меньше
        },
      ];

      const sl = createSickLeave(
        "sick:edge:04",
        ld(2026, 6, 1),
        5,
        "work-injury",
        "under5",
      );

      const events = calculateSickLeavePayments(
        [sl],
        defaultSettings,
        calendars,
        incomeWithFact,
        100_000 * 100,
      );

      // СДЗ = factKop / 730 = 80_000_000 / 730 ≈ 109_589 коп/день
      const avgDailyEarningsKop = Math.round(80_000_000 / 730);

      const sfrEvent = events.find((e) => e.type === "sick-leave-sfr");
      expect(sfrEvent!.grossKop).toBe(5 * avgDailyEarningsKop);
    });

    it("incomeRecords: grossKop используется когда factKop отсутствует", () => {
      const incomeWithoutFact: IncomeRecord[] = [
        {
          type: "salary",
          accrualDate: ld(2024, 6, 15),
          grossKop: 100_000_000,
        },
      ];

      const sl = createSickLeave(
        "sick:edge:05",
        ld(2026, 6, 1),
        3,
        "work-injury",
        "under5",
      );

      const events = calculateSickLeavePayments(
        [sl],
        defaultSettings,
        calendars,
        incomeWithoutFact,
        100_000 * 100,
      );

      // СДЗ = 100_000_000 / 730 ≈ 136_986 коп/день (выше минимума 89_073)
      const avgDailyEarningsKop = Math.round(100_000_000 / 730);

      const sfrEvent = events.find((e) => e.type === "sick-leave-sfr");
      expect(sfrEvent!.grossKop).toBe(3 * avgDailyEarningsKop);
    });

    it("child-care-under7: стаж не влияет, всегда 100%", () => {
      const sl = createSickLeave(
        "sick:edge:06",
        ld(2026, 6, 1),
        5,
        "child-care-under7",
        "under5", // стаж < 5 лет – но не должен влиять
      );

      const events = calculateSickLeavePayments(
        [sl],
        defaultSettings,
        calendars,
        incomeRecords2026,
        100_000 * 100,
      );

      const avgDailyEarningsKop = Math.round(100_000_000 / 730);

      expect(events.find((e) => e.type === "sick-leave")).toBeUndefined();
      const sfrEvent = events.find((e) => e.type === "sick-leave-sfr");
      expect(sfrEvent!.grossKop).toBe(5 * avgDailyEarningsKop);
    });

    it("child-care-7to15 ровно 10 дней: все по стажу, без 50%", () => {
      const sl = createSickLeave(
        "sick:edge:07",
        ld(2026, 6, 1),
        10,
        "child-care-7to15",
        "8plus",
      );

      const events = calculateSickLeavePayments(
        [sl],
        defaultSettings,
        calendars,
        incomeRecords2026,
        100_000 * 100,
      );

      const avgDailyEarningsKop = Math.round(100_000_000 / 730);

      // Все 10 дней ≤ 10 → 100% по стажу (8plus = 100%)
      const sfrEvent = events.find((e) => e.type === "sick-leave-sfr");
      expect(sfrEvent!.grossKop).toBe(10 * avgDailyEarningsKop);
    });

    it("child-care-7to15 11 дней: 10 по стажу + 1 по 50%", () => {
      const sl = createSickLeave(
        "sick:edge:08",
        ld(2026, 6, 1),
        11,
        "child-care-7to15",
        "8plus",
      );

      const events = calculateSickLeavePayments(
        [sl],
        defaultSettings,
        calendars,
        incomeRecords2026,
        100_000 * 100,
      );

      const avgDailyEarningsKop = Math.round(100_000_000 / 730);

      const sfrEvent = events.find((e) => e.type === "sick-leave-sfr");
      expect(sfrEvent!.grossKop).toBe(
        10 * avgDailyEarningsKop + Math.round(avgDailyEarningsKop * 0.5),
      );
    });

    it("несколько больничных: события не пересекаются по sourceId", () => {
      const sl1 = createSickLeave(
        "sick:multi:01",
        ld(2026, 3, 1),
        5,
        "illness",
        "8plus",
      );
      const sl2 = createSickLeave(
        "sick:multi:02",
        ld(2026, 6, 1),
        7,
        "work-injury",
        "under5",
      );

      const events = calculateSickLeavePayments(
        [sl1, sl2],
        defaultSettings,
        calendars,
        incomeRecords2026,
        100_000 * 100,
      );

      // Уникальные sourceId
      const sourceIds = events.map((e) => e.sourceId);
      const uniqueIds = new Set(sourceIds);
      expect(uniqueIds.size).toBe(sourceIds.length);

      // События первого больничного
      const sl1Events = events.filter((e) => e.sourceId.includes("sick:multi:01"));
      expect(sl1Events.length).toBeGreaterThan(0);

      // События второго больничного
      const sl2Events = events.filter((e) => e.sourceId.includes("sick:multi:02"));
      expect(sl2Events.length).toBeGreaterThan(0);
    });
  });
});

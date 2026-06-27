import { describe, it, expect } from "vitest";
import { calculateSickLeavePayments } from "@/features/payments/model/calculation/sick-leave";
import type { SickLeave, SickLeaveSettings } from "@/shared/types";
import type { IncomeRecord } from "@/features/payments/model/calculation/vacation";
import { localDate as ld } from "@/shared/types/local-date";
import { loadCalendars } from "./fixtures/calendars";

const defaultSettings: SickLeaveSettings = {
  enableTopUp: false,
  topUpDaysLimitPerYear: 30,
};

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

describe("sick-leave-calculation", () => {
  const calendars = loadCalendars(2024, 2025, 2026);

  describe("СДЗ (average daily earnings)", () => {
    it("расчёт из истории доходов: gross за 2 года / 730", () => {
      // Доход за 2024-2025: 1_000_000 ₽ = 100_000_000 коп
      const incomeRecords: IncomeRecord[] = [
        {
          type: "salary",
          accrualDate: ld(2024, 6, 15),
          grossKop: 50_000_000,
        },
        {
          type: "salary",
          accrualDate: ld(2025, 3, 15),
          grossKop: 50_000_000,
        },
      ];

      const sl = createSickLeave("sick:2026:01", ld(2026, 6, 1), 7, "illness", "8plus");
      const events = calculateSickLeavePayments(
        [sl],
        defaultSettings,
        calendars,
        incomeRecords,
        100_000 * 100, // оклад 100k (не используется — есть история)
      );

      // СДЗ = 100_000_000 / 730 ≈ 136_986 коп/день
      // illness: дни 1-3 работодатель, дни 4-7 СФР (4 дня)
      const sfrEvent = events.find((e) => e.type === "sick-leave-sfr");
      expect(sfrEvent).toBeDefined();

      // dailyBenefit = 136_986 * 100% = 136_986 коп/день
      // sfrGross = 4 * 136_986 ≈ 547_944 коп
      const expectedAvgDailyEarningsKop = Math.round(100_000_000 / 730);
      const expectedSfrGross = 4 * expectedAvgDailyEarningsKop;
      expect(sfrEvent!.grossKop).toBe(expectedSfrGross);
    });

    it("fallback на оклад при отсутствии истории", () => {
      // Оклад 100_000 ₽ → СДЗ = 100_000 * 24 / 730 ≈ 3287,67 ₽/день = 328_767 коп
      // Но clamp по минимуму: MIN_AVG_DAILY_EARNINGS_KOP = 89_073 коп (890.73 ₽)
      const sl = createSickLeave("sick:2026:01", ld(2026, 6, 1), 5, "illness", "8plus");
      const events = calculateSickLeavePayments(
        [sl],
        defaultSettings,
        calendars,
        [], // нет истории
        100_000 * 100,
      );

      // СДЗ fallback: round(10_000_000 * 24 / 730) = round(328_767.12) = 328_767 коп
      const avgDailyEarningsKop = Math.round((100_000 * 100 * 24) / 730);

      // illness: дни 1-3 работодатель, день 4-5 СФР (2 дня)
      const sfrEvent = events.find((e) => e.type === "sick-leave-sfr");
      expect(sfrEvent).toBeDefined();
      expect(sfrEvent!.grossKop).toBe(2 * avgDailyEarningsKop);

      // Работодатель: 3 дня × СДЗ
      const empEvent = events.find((e) => e.type === "sick-leave");
      expect(empEvent).toBeDefined();
      expect(empEvent!.grossKop).toBe(3 * avgDailyEarningsKop);
    });

    it("clamp по максимуму: СДЗ не выше 682_740 коп (illness)", () => {
      // Доход за 2 года: 10_000_000 ₽ = 1_000_000_000 коп → СДЗ ≈ 1_369_863 коп > макс
      const incomeRecords: IncomeRecord[] = [
        {
          type: "salary",
          accrualDate: ld(2024, 12, 15),
          grossKop: 1_000_000_000,
        },
      ];

      const sl = createSickLeave("sick:2026:01", ld(2026, 6, 1), 5, "illness", "8plus");
      const events = calculateSickLeavePayments(
        [sl],
        defaultSettings,
        calendars,
        incomeRecords,
        100_000 * 100,
      );

      // illness: дни 1-3 работодатель, дни 4-5 СФР (2 дня)
      const sfrEvent = events.find((e) => e.type === "sick-leave-sfr");
      expect(sfrEvent).toBeDefined();
      // dailyBenefit = clamp(1_369_863, max=682_740) = 682_740 коп/день
      expect(sfrEvent!.grossKop).toBe(2 * 682_740);
    });

    it("work-injury: СДЗ без clamp по максимуму (ст. 9 ФЗ-125)", () => {
      // Доход за 2 года: 10_000_000 ₽ = 1_000_000_000 коп → СДЗ ≈ 1_369_863 коп (без лимита)
      const incomeRecords: IncomeRecord[] = [
        {
          type: "salary",
          accrualDate: ld(2024, 12, 15),
          grossKop: 1_000_000_000,
        },
      ];

      const sl = createSickLeave("sick:2026:01", ld(2026, 6, 1), 3, "work-injury", "under5");
      const events = calculateSickLeavePayments(
        [sl],
        defaultSettings,
        calendars,
        incomeRecords,
        100_000 * 100,
      );

      const sfrEvent = events.find((e) => e.type === "sick-leave-sfr");
      expect(sfrEvent).toBeDefined();
      // dailyBenefit = round(1_000_000_000 / 730) = 1_369_863 коп/день (без clamp по максимуму)
      const avgDailyEarningsKop = Math.round(1_000_000_000 / 730);
      expect(sfrEvent!.grossKop).toBe(3 * avgDailyEarningsKop);
    });

    it("clamp по минимуму: СДЗ не ниже 89_073 коп", () => {
      // Доход за 2 года: 100 ₽ = 10_000 коп → СДЗ ≈ 13 коп < мин
      const incomeRecords: IncomeRecord[] = [
        {
          type: "salary",
          accrualDate: ld(2024, 6, 15),
          grossKop: 10_000,
        },
      ];

      const sl = createSickLeave("sick:2026:01", ld(2026, 6, 1), 3, "work-injury", "under5");
      const events = calculateSickLeavePayments(
        [sl],
        defaultSettings,
        calendars,
        incomeRecords,
        100_000 * 100,
      );

      const sfrEvent = events.find((e) => e.type === "sick-leave-sfr");
      expect(sfrEvent).toBeDefined();
      // dailyBenefit = clamp(13, min=89_073) = 89_073 коп/день
      expect(sfrEvent!.grossKop).toBe(3 * 89_073);
    });
  });

  describe("% по стажу", () => {
    const incomeRecords: IncomeRecord[] = [
      { type: "salary", accrualDate: ld(2024, 6, 15), grossKop: 100_000_000 },
    ];

    it("under5: 60% от СДЗ", () => {
      const sl = createSickLeave("sick:2026:01", ld(2026, 6, 1), 3, "illness", "under5");
      const events = calculateSickLeavePayments(
        [sl],
        defaultSettings,
        calendars,
        incomeRecords,
        100_000 * 100,
      );

      // СДЗ ≈ 136_986 коп/день, dailyBenefit = round(136_986 * 60 / 100) = 82_191 коп
      const avgDailyEarningsKop = Math.round(100_000_000 / 730);
      const dailyBenefitKop = Math.round(avgDailyEarningsKop * 60 / 100);

      // illness: дни 1-3 работодатель (нет СФР)
      const empEvent = events.find((e) => e.type === "sick-leave");
      expect(empEvent!.grossKop).toBe(3 * dailyBenefitKop);
    });

    it("5to8: 80% от СДЗ", () => {
      const sl = createSickLeave("sick:2026:01", ld(2026, 6, 1), 3, "illness", "5to8");
      const events = calculateSickLeavePayments(
        [sl],
        defaultSettings,
        calendars,
        incomeRecords,
        100_000 * 100,
      );

      const avgDailyEarningsKop = Math.round(100_000_000 / 730);
      const dailyBenefitKop = Math.round(avgDailyEarningsKop * 80 / 100);

      const empEvent = events.find((e) => e.type === "sick-leave");
      expect(empEvent!.grossKop).toBe(3 * dailyBenefitKop);
    });

    it("8plus: 100% от СДЗ", () => {
      const sl = createSickLeave("sick:2026:01", ld(2026, 6, 1), 3, "illness", "8plus");
      const events = calculateSickLeavePayments(
        [sl],
        defaultSettings,
        calendars,
        incomeRecords,
        100_000 * 100,
      );

      const avgDailyEarningsKop = Math.round(100_000_000 / 730);

      const empEvent = events.find((e) => e.type === "sick-leave");
      expect(empEvent!.grossKop).toBe(3 * avgDailyEarningsKop);
    });
  });

  describe("типы причин", () => {
    const incomeRecords: IncomeRecord[] = [
      { type: "salary", accrualDate: ld(2024, 6, 15), grossKop: 100_000_000 },
    ];

    it("illness: дни 1-3 работодатель, день 4+ СФР", () => {
      const sl = createSickLeave("sick:2026:01", ld(2026, 6, 1), 7, "illness", "8plus");
      const events = calculateSickLeavePayments(
        [sl],
        defaultSettings,
        calendars,
        incomeRecords,
        100_000 * 100,
      );

      const avgDailyEarningsKop = Math.round(100_000_000 / 730);

      const empEvent = events.find((e) => e.type === "sick-leave");
      expect(empEvent).toBeDefined();
      expect(empEvent!.grossKop).toBe(3 * avgDailyEarningsKop);

      const sfrEvent = events.find((e) => e.type === "sick-leave-sfr");
      expect(sfrEvent).toBeDefined();
      expect(sfrEvent!.grossKop).toBe(4 * avgDailyEarningsKop);
    });

    it("work-injury: СФР с 1 дня, всегда 100%", () => {
      const sl = createSickLeave("sick:2026:01", ld(2026, 6, 1), 5, "work-injury", "under5");
      const events = calculateSickLeavePayments(
        [sl],
        defaultSettings,
        calendars,
        incomeRecords,
        100_000 * 100,
      );

      const avgDailyEarningsKop = Math.round(100_000_000 / 730);

      // Нет employer benefit (дни 1-3)
      expect(events.find((e) => e.type === "sick-leave")).toBeUndefined();

      // СФР с 1 дня, 100% (независимо от стажа)
      const sfrEvent = events.find((e) => e.type === "sick-leave-sfr");
      expect(sfrEvent).toBeDefined();
      expect(sfrEvent!.grossKop).toBe(5 * avgDailyEarningsKop);
    });

    it("child-care-under7: СФР с 1 дня, всегда 100%", () => {
      const sl = createSickLeave(
        "sick:2026:01",
        ld(2026, 6, 1),
        5,
        "child-care-under7",
        "under5",
      );
      const events = calculateSickLeavePayments(
        [sl],
        defaultSettings,
        calendars,
        incomeRecords,
        100_000 * 100,
      );

      const avgDailyEarningsKop = Math.round(100_000_000 / 730);

      expect(events.find((e) => e.type === "sick-leave")).toBeUndefined();

      const sfrEvent = events.find((e) => e.type === "sick-leave-sfr");
      expect(sfrEvent!.grossKop).toBe(5 * avgDailyEarningsKop);
    });

    it("child-care-7to15: первые 10 дней по стажу, далее 50%", () => {
      const sl = createSickLeave(
        "sick:2026:01",
        ld(2026, 6, 1),
        14,
        "child-care-7to15",
        "8plus",
      );
      const events = calculateSickLeavePayments(
        [sl],
        defaultSettings,
        calendars,
        incomeRecords,
        100_000 * 100,
      );

      const avgDailyEarningsKop = Math.round(100_000_000 / 730);
      // Первые 10 дней: 100% от СДЗ (стаж 8plus)
      // Дни 11-14: 50% от СДЗ
      const firstTenBenefit = 10 * avgDailyEarningsKop;
      const remainingBenefit = 4 * Math.round(avgDailyEarningsKop * 0.5);

      expect(events.find((e) => e.type === "sick-leave")).toBeUndefined();

      const sfrEvent = events.find((e) => e.type === "sick-leave-sfr");
      expect(sfrEvent!.grossKop).toBe(firstTenBenefit + remainingBenefit);
    });
  });

  describe("дата выплаты", () => {
    it("endDate с переносом на рабочий день", () => {
      // Больничный: 1-7 июня (endDate = 07.06, суббота)
      const sl = createSickLeave("sick:2026:01", ld(2026, 6, 1), 7, "illness", "8plus");
      const events = calculateSickLeavePayments(
        [sl],
        defaultSettings,
        calendars,
        [],
        100_000 * 100,
      );

      // endDate = 07.06 (суббота) → findPreviousWorkday → 05.06 (пятница)
      for (const e of events) {
        expect(e.date.toString()).toBe("2026-06-05");
      }
    });

    it("пустой список больничных → пустые события", () => {
      const events = calculateSickLeavePayments(
        [],
        defaultSettings,
        calendars,
        [],
        100_000 * 100,
      );
      expect(events).toEqual([]);
    });
  });
});

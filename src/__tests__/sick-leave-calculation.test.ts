import { describe, it, expect } from "vitest";
import { calculateSickLeavePayments } from "@/features/payments/model/calculation/sick-leave";
import { getSickLeaveLimits } from "@/features/payments/model/calculation/sickLeaveLimits";
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
        100_000 * 100, // оклад 100k (не используется – есть история)
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

  describe("лимиты СДЗ по годам", () => {
    it("getSickLeaveLimits: значения 2024–2026", () => {
      // MIN = МРОТ × 24 / 730; MAX = (потолок (N-1) + потолок (N-2)) / 730.
      expect(getSickLeaveLimits(2024)).toEqual({
        minAvgDailyEarningsKop: 63_261, // 19 242 × 24 / 730
        maxAvgDailyEarningsKop: 476_301, // (1 560 000 + 1 917 000) / 730
      });
      expect(getSickLeaveLimits(2025)).toEqual({
        minAvgDailyEarningsKop: 73_775, // 22 440 × 24 / 730
        maxAvgDailyEarningsKop: 567_397, // (1 917 000 + 2 225 000) / 730
      });
      expect(getSickLeaveLimits(2026)).toEqual({
        minAvgDailyEarningsKop: 89_073, // 27 093 × 24 / 730
        maxAvgDailyEarningsKop: 682_740, // (2 225 000 + 2 759 000) / 730
      });
    });

    it("getSickLeaveLimits: значения 2020–2023", () => {
      expect(getSickLeaveLimits(2020)).toEqual({
        minAvgDailyEarningsKop: 39_879, // 12 130 × 24 / 730
        maxAvgDailyEarningsKop: 297_260, // (1 020 000 + 1 150 000) / 730
      });
      expect(getSickLeaveLimits(2021)).toEqual({
        minAvgDailyEarningsKop: 42_056, // 12 792 × 24 / 730
        maxAvgDailyEarningsKop: 334_575, // (1 150 000 + 1 292 400) / 730
      });
      expect(getSickLeaveLimits(2022)).toEqual({
        minAvgDailyEarningsKop: 45_666, // 13 890 × 24 / 730
        maxAvgDailyEarningsKop: 391_425, // (1 292 400 + 1 565 000) / 730
      });
      expect(getSickLeaveLimits(2023)).toEqual({
        minAvgDailyEarningsKop: 53_398, // 16 242 × 24 / 730
        maxAvgDailyEarningsKop: 428_082, // (1 560 000 + 1 565 000) / 730
      });
    });

    it("getSickLeaveLimits: годы вне таблицы – ближайший год", () => {
      // 2018/2019 – clamp на 2020 (MIN_DISPLAY_YEAR), лимиты идентичны
      expect(getSickLeaveLimits(2018)).toEqual(getSickLeaveLimits(2019));
      expect(getSickLeaveLimits(2028)).toEqual(getSickLeaveLimits(2027));
    });

    it("2027: max – по базам 2026+2025, min – МРОТ 2026 (fallback)", () => {
      expect(getSickLeaveLimits(2027)).toEqual({
        minAvgDailyEarningsKop: 89_073, // МРОТ 2027 не установлен → 2026
        maxAvgDailyEarningsKop: 786_027, // (2 979 000 + 2 759 000) / 730
      });
    });

    it("2024: clamp по минимуму использует МРОТ 2024 (63 261, а не 89 073)", () => {
      const incomeRecords: IncomeRecord[] = [
        { type: "salary", accrualDate: ld(2023, 6, 15), grossKop: 10_000 },
      ];
      const sl = createSickLeave("sick:2024:06", ld(2024, 6, 1), 3, "work-injury", "under5");
      const events = calculateSickLeavePayments(
        [sl],
        defaultSettings,
        calendars,
        incomeRecords,
        100_000 * 100,
      );

      const sfrEvent = events.find((e) => e.type === "sick-leave-sfr");
      expect(sfrEvent!.grossKop).toBe(3 * 63_261);
    });

    it("2025: clamp по максимуму использует потолок 2023+2024 (567 397, а не 682 740)", () => {
      const incomeRecords: IncomeRecord[] = [
        { type: "salary", accrualDate: ld(2024, 12, 15), grossKop: 1_000_000_000 },
      ];
      const sl = createSickLeave("sick:2025:06", ld(2025, 6, 1), 3, "illness", "8plus");
      const events = calculateSickLeavePayments(
        [sl],
        defaultSettings,
        calendars,
        incomeRecords,
        100_000 * 100,
      );

      // illness: дни 1-3 работодатель
      const empEvent = events.find((e) => e.type === "sick-leave");
      expect(empEvent!.grossKop).toBe(3 * 567_397);
    });
  });

  describe("кап по производственной травме по годам", () => {
    // Доход за 2 года: 30 000 000 ₽ = 3_000_000_000 коп → СДЗ = 4_109_589 коп/день.
    // 30 дней в одном месяце → СФР часть сильно выше капа → применяется лимит.
    const avgDailyEarningsKop = Math.round(3_000_000_000 / 730);

    function workInjurySfrGrossKop(
      startDate: ReturnType<typeof ld>,
      calendarDays: number,
      incomeYear: number,
    ): number {
      const incomeRecords: IncomeRecord[] = [
        { type: "salary", accrualDate: ld(incomeYear, 6, 15), grossKop: 3_000_000_000 },
      ];
      const sl = createSickLeave(
        `sick:${startDate.year}:wi`,
        startDate,
        calendarDays,
        "work-injury",
        "under5",
      );
      const events = calculateSickLeavePayments(
        [sl],
        defaultSettings,
        calendars,
        incomeRecords,
        100_000 * 100,
      );
      const sfrEvent = events.find((e) => e.type === "sick-leave-sfr");
      expect(sfrEvent).toBeDefined();
      return sfrEvent!.grossKop;
    }

    it("2024: СФР часть не выше 43 513 616 коп", () => {
      expect(30 * avgDailyEarningsKop).toBeGreaterThan(43_513_616);
      expect(workInjurySfrGrossKop(ld(2024, 6, 1), 30, 2023)).toBe(43_513_616);
    });

    it("2025: СФР часть не выше 47 647 408 коп", () => {
      expect(workInjurySfrGrossKop(ld(2025, 6, 1), 30, 2024)).toBe(47_647_408);
    });

    it("2026: СФР часть не выше 50 315 664 коп", () => {
      expect(workInjurySfrGrossKop(ld(2026, 6, 1), 30, 2025)).toBe(50_315_664);
    });

    it("январь 2026: лимит 2025 (47 647 408 коп)", () => {
      expect(workInjurySfrGrossKop(ld(2026, 1, 1), 31, 2025)).toBe(47_647_408);
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

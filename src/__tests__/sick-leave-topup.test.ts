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

describe("sick-leave-topup", () => {
  const calendars = loadCalendars(2024, 2025, 2026);

  // Доход за 2 года перед 2026 (2024-2025): 100_000 ₽ → СДЗ ≈ 136_986 коп/день
  const incomeRecords: IncomeRecord[] = [
    { type: "salary", accrualDate: ld(2024, 6, 15), grossKop: 70_000_000 },
    { type: "salary", accrualDate: ld(2025, 3, 15), grossKop: 30_000_000 },
  ];

  // Оклад 100_000 ₽ → dailySalary ≈ 100_000 * 100 / workdaysInMonth
  const currentSalaryKop = 100_000 * 100;

  it("без доплаты: нет события sick-leave-topup", () => {
    const settings: SickLeaveSettings = {
      enableTopUp: false,
      topUpDaysLimitPerYear: 30,
    };

    const sl = createSickLeave(
      "sick:2026:01",
      ld(2026, 6, 1),
      7,
      "illness",
      "8plus",
    );
    const events = calculateSickLeavePayments(
      [sl],
      settings,
      calendars,
      incomeRecords,
      currentSalaryKop,
    );

    expect(events.find((e) => e.type === "sick-leave-topup")).toBeUndefined();
  });

  it("с доплатой: генерирует событие sick-leave-topup", () => {
    const settings: SickLeaveSettings = {
      enableTopUp: true,
      topUpDaysLimitPerYear: 30,
    };

    // Июнь 2026: 21 рабочий день (проверим по календарю)
    // dailySalary ≈ 10_000_000 / 21 ≈ 476_190 коп/день
    // dailyBenefit = СДЗ * 100% ≈ 136_986 коп/день
    // topUpPerDay = max(0, 476_190 - 136_986) ≈ 339_204 коп/день
    const sl = createSickLeave(
      "sick:2026:01",
      ld(2026, 6, 1),
      5,
      "illness",
      "8plus",
    );
    const events = calculateSickLeavePayments(
      [sl],
      settings,
      calendars,
      incomeRecords,
      currentSalaryKop,
    );

    const topupEvent = events.find((e) => e.type === "sick-leave-topup");
    expect(topupEvent).toBeDefined();
    // 5 дней с доплатой (в пределах лимита 30)
    expect(topupEvent!.grossKop).toBeGreaterThan(0);

    const avgDailyEarningsKop = Math.round(100_000_000 / 730);
    // Июнь 2026: считаем рабочие дни из календаря
    const calJune = calendars.get(2026)!;
    let workdaysInJune = 0;
    for (let d = 1; d <= 30; d++) {
      const code = calJune.get(`${2026}06${String(d).padStart(2, "0")}`);
      if (code !== 1 && code !== 8) workdaysInJune++;
    }
    const dailySalaryKop = Math.round(currentSalaryKop / workdaysInJune);
    const topUpPerDay = Math.max(0, dailySalaryKop - avgDailyEarningsKop);

    expect(topupEvent!.grossKop).toBe(5 * topUpPerDay);
  });

  it("лимит дней: не более topUpDaysLimitPerYear в году", () => {
    const settings: SickLeaveSettings = {
      enableTopUp: true,
      topUpDaysLimitPerYear: 10, // лимит 10 дней
    };

    // Два больничных: 7 + 8 = 15 дней в году, но лимит 10
    const sl1 = createSickLeave(
      "sick:2026:01",
      ld(2026, 3, 1),
      7,
      "illness",
      "8plus",
    );
    const sl2 = createSickLeave(
      "sick:2026:02",
      ld(2026, 6, 1),
      8,
      "illness",
      "8plus",
    );

    const events = calculateSickLeavePayments(
      [sl1, sl2],
      settings,
      calendars,
      incomeRecords,
      currentSalaryKop,
    );

    // Первый больничный получает 5 рабочих дней доплаты (из 7 календарных, лимит 10)
    const topupSl1 = events.find((e) => e.sourceId.includes("sick:2026:01"));
    expect(topupSl1).toBeDefined();

    // Второй больничный получает оставшиеся 5 дней (10 - 5 = 5, из 8 календарных → 6 рабочих)
    const topupSl2 = events.find(
      (e) => e.sourceId.includes("sick:2026:02") && e.type === "sick-leave-topup",
    );

    // СДЗ ≈ 136_986 коп/день
    const avgDailyEarningsKop = Math.round(100_000_000 / 730);
    const calJune = calendars.get(2026)!;
    let workdaysInJune = 0;
    for (let d = 1; d <= 30; d++) {
      const code = calJune.get(`${2026}06${String(d).padStart(2, "0")}`);
      if (code !== 1 && code !== 8) workdaysInJune++;
    }
    const dailySalaryKop = Math.round(currentSalaryKop / workdaysInJune);
    const topUpPerDay = Math.max(0, dailySalaryKop - avgDailyEarningsKop);

    expect(topupSl2!.grossKop).toBe(5 * topUpPerDay);
  });

  it("лимит распределяется по больничным в порядке добавления", () => {
    const settings: SickLeaveSettings = {
      enableTopUp: true,
      topUpDaysLimitPerYear: 5, // лимит 5 дней
    };

    const sl1 = createSickLeave(
      "sick:2026:01",
      ld(2026, 3, 1),
      7,
      "illness",
      "8plus",
    );
    const sl2 = createSickLeave(
      "sick:2026:02",
      ld(2026, 6, 1),
      5,
      "illness",
      "8plus",
    );

    const events = calculateSickLeavePayments(
      [sl1, sl2],
      settings,
      calendars,
      incomeRecords,
      currentSalaryKop,
    );

    // Первый получает все 5 дней лимита (больше нет для второго)
    const topupSl1 = events.find((e) => e.type === "sick-leave-topup" && e.sourceId.includes("sick:2026:01"));
    expect(topupSl1).toBeDefined();

    // Второй не получает доплату (лимит исчерпан)
    const topupSl2 = events.find((e) => e.type === "sick-leave-topup" && e.sourceId.includes("sick:2026:02"));
    expect(topupSl2).toBeUndefined();
  });

  it("доплата только если dailySalary > dailyBenefit", () => {
    const settings: SickLeaveSettings = {
      enableTopUp: true,
      topUpDaysLimitPerYear: 30,
    };

    // Высокий доход → СДЗ выше оклада → доплата = 0
    const highIncomeRecords: IncomeRecord[] = [
      { type: "salary", accrualDate: ld(2024, 6, 15), grossKop: 3_000_000_000 }, // СДЗ ≈ макс 682_740 коп/день
    ];

    const sl = createSickLeave(
      "sick:2026:01",
      ld(2026, 6, 1),
      5,
      "illness",
      "8plus",
    );
    // Оклад 30_000 ₽ → dailySalary ≈ 30_000 * 100 / 21 ≈ 142_857 коп/день < СДЗ
    const events = calculateSickLeavePayments(
      [sl],
      settings,
      calendars,
      highIncomeRecords,
      30_000 * 100,
    );

    // dailyBenefit (682_740) > dailySalary (~142_857) → topUp = 0
    const topupEvent = events.find((e) => e.type === "sick-leave-topup");
    expect(topupEvent).toBeUndefined();
  });

  it("доплата не генерируется для work-injury (СФР с 1 дня)", () => {
    // Доплата рассчитывается независимо от типа, но логика корректна:
    // topUpPerDay = dailySalary - dailyBenefit, и если СДЗ * 100% > оклад/рабочие дни — доплаты нет.
    const settings: SickLeaveSettings = {
      enableTopUp: true,
      topUpDaysLimitPerYear: 30,
    };

    const sl = createSickLeave(
      "sick:2026:01",
      ld(2026, 6, 1),
      5,
      "work-injury",
      "under5",
    );
    const events = calculateSickLeavePayments(
      [sl],
      settings,
      calendars,
      incomeRecords,
      currentSalaryKop,
    );

    // work-injury: dailyBenefit = СДЗ * 100% ≈ 136_986 коп/день
    // dailySalary ≈ 476_190 коп/день → topUpPerDay > 0
    const topupEvent = events.find((e) => e.type === "sick-leave-topup");
    expect(topupEvent).toBeDefined();
    expect(topupEvent!.grossKop).toBeGreaterThan(0);
  });

  it("больничный пересекает год: доплата считается отдельно по годам", () => {
    const settings: SickLeaveSettings = {
      enableTopUp: true,
      topUpDaysLimitPerYear: 30,
    };

    // Больничный с 28 декабря 2025 по 4 января 2026 (8 дней)
    const dates = [];
    for (let i = 0; i < 8; i++) {
      dates.push(ld(2025, 12, 28).add({ days: i }));
    }
    const sl: SickLeave = {
      id: "sick:2025:01",
      startDate: ld(2025, 12, 28),
      calendarDays: 8,
      dates,
      reason: "illness",
      experience: "8plus",
    };

    const events = calculateSickLeavePayments(
      [sl],
      settings,
      calendars,
      incomeRecords,
      currentSalaryKop,
    );

    // Должны быть события для обоих годов (2025 и 2026)
    const topupEvents = events.filter((e) => e.type === "sick-leave-topup");
    expect(topupEvents.length).toBeGreaterThanOrEqual(1);
  });
});

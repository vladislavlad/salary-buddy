import { describe, it, expect } from "vitest";
import { calculateAll } from "@/features/payments/model/calculation-engine";
import type {
  SalaryCalculationSettings,
  Bonus,
  SickLeave,
  SickLeaveSettings,
  Payment,
} from "@/shared/types";
import { localDate as ld } from "@/shared/types/local-date";
import { countWorkdays } from "@/features/calendar/model/calendar";
import { loadCalendars } from "./fixtures/calendars";

function createSickLeave(
  id: string,
  startDate: ReturnType<typeof ld>,
  calendarDays: number,
  reason: SickLeave["reason"],
  experience: SickLeave["experience"],
): SickLeave {
  const dates = [];
  for (let i = 0; i < calendarDays; i++) dates.push(startDate.add({ days: i }));
  return { id, startDate, calendarDays, dates, reason, experience };
}

/**
 * Сквозной сценарий, проверяющий взаимодействие всех типов выплат на одной шкале:
 *  - оклад 200 000 ₽ с 01.01.2025;
 *  - премия в 1 оклад в июне 2025;
 *  - повышение оклада до 250 000 ₽ с 01.02.2026;
 *  - премия в 1 оклад в марте 2026;
 *  - больничный 6-10 апреля 2026 (Пн-Пт, 5 календарных дней, illness, стаж 8+).
 */
describe("движок: полный сценарий (оклад + повышение + премии + больничный)", () => {
  const calendars = loadCalendars(2024, 2025, 2026);

  const OKLAD_2025 = 200_000 * 100; // копейки
  const OKLAD_2026 = 250_000 * 100;

  const settings: SalaryCalculationSettings = {
    advancePaymentDay: 20,
    salaryPaymentDay: 5,
    distribution: "by-worked-days",
    salaryChanges: [
      { id: "1", effectiveDate: ld(2025, 1, 1), amount: OKLAD_2025 },
      { id: "2", effectiveDate: ld(2026, 2, 1), amount: OKLAD_2026 },
    ],
  };

  const bonuses: Bonus[] = [
    { id: "bon:2025:06", date: ld(2025, 6, 16), amount: 1, type: "salaries" },
    { id: "bon:2026:03", date: ld(2026, 3, 16), amount: 1, type: "salaries" },
  ];

  // Больничный: 6-10 апреля 2026 (Пн-Пт), все 5 дней – рабочие, первая половина месяца.
  const sickLeave = createSickLeave(
    "sick:2026:01",
    ld(2026, 4, 6),
    5,
    "illness",
    "8plus",
  );

  const sickLeaveSettings: SickLeaveSettings = {
    enableTopUp: false,
    topUpDaysLimitPerYear: 30,
  };

  const baseInput = {
    settings,
    bonuses,
    surcharges: [],
    vacations: [],
    sickLeaveSettings,
    calendarsByYear: calendars,
  };

  const payments = calculateAll({ ...baseInput, sickLeaves: [sickLeave] });
  const paymentsNoSick = calculateAll({ ...baseInput, sickLeaves: [] });

  const findPay = (
    ps: Payment[],
    type: Payment["type"],
    month: number,
    year: number,
  ) => ps.find((p) => p.type === type && p.month === month && p.date.year === year);

  const monthTotal = (ps: Payment[], year: number, month: number) =>
    (findPay(ps, "advance", month, year)?.gross ?? 0) +
    (findPay(ps, "salary", month, year)?.gross ?? 0);

  it("оклад 2025: полный месяц без отсутствий ≈ 200 000 ₽", () => {
    // toBeCloseTo(-2): допуск 50 коп на пер-дневное округление.
    expect(monthTotal(payments, 2025, 7)).toBeCloseTo(OKLAD_2025, -2);
  });

  it("повышение оклада действует с февраля 2026 (январь – ещё старый оклад)", () => {
    expect(monthTotal(payments, 2026, 1)).toBeCloseTo(OKLAD_2025, -2);
    expect(monthTotal(payments, 2026, 3)).toBeCloseTo(OKLAD_2026, -2);
  });

  it("премия = 1 оклад по окладу на дату премии (200k в 2025, 250k в 2026)", () => {
    const bonus2025 = payments.find(
      (p) => p.type === "bonus" && p.date.year === 2025,
    );
    const bonus2026 = payments.find(
      (p) => p.type === "bonus" && p.date.year === 2026,
    );
    expect(bonus2025!.gross).toBe(OKLAD_2025);
    expect(bonus2026!.gross).toBe(OKLAD_2026);
    expect(bonus2025!.ndfl).toBeGreaterThan(0);
    expect(bonus2026!.ndfl).toBeGreaterThan(0);
  });

  it("НДФЛ накапливается за год: итог 2025 = 12 окладов + премия", () => {
    const max2025 = Math.max(
      ...payments
        .filter((p) => p.date.year === 2025)
        .map((p) => p.yearToDateGross),
    );
    // 12 × 200 000 + премия 200 000 = 2 600 000 ₽
    expect(max2025).toBeCloseTo(2_600_000 * 100, -3);
  });

  it("год сбрасывает накопление: первый платёж 2026 < итога 2025", () => {
    const first2026 = [...payments]
      .filter((p) => p.date.year === 2026)
      .sort((a, b) => a.date.toString().localeCompare(b.date.toString()))[0]!;
    // Накопление обнуляется к январю 2026.
    expect(first2026.yearToDateGross).toBeLessThan(OKLAD_2026 * 2);
  });

  it("больничный: 3 дня работодателя + 2 дня СФР по одному СДЗ (2·emp = 3·sfr)", () => {
    const employer = payments.filter((p) => p.type === "sick-leave");
    const sfr = payments.filter((p) => p.type === "sick-leave-sfr");

    expect(employer).toHaveLength(1);
    expect(sfr).toHaveLength(1);

    // 3 дня работодателя и 2 дня СФР по одной дневной ставке.
    expect(2 * employer[0]!.gross).toBe(3 * sfr[0]!.gross);

    const dailyBenefit = employer[0]!.gross / 3;
    expect(dailyBenefit).toBeGreaterThan(89_073); // не ниже минимума СДЗ
    expect(dailyBenefit).toBeLessThanOrEqual(682_740); // не выше максимума СДЗ
  });

  it("больничный: СФР без НДФЛ (net = gross), работодатель – с НДФЛ", () => {
    const sfr = payments.find((p) => p.type === "sick-leave-sfr")!;
    const employer = payments.find((p) => p.type === "sick-leave")!;

    expect(sfr.ndfl).toBe(0);
    expect(sfr.net).toBe(sfr.gross);

    expect(employer.ndfl).toBeGreaterThan(0);
    expect(employer.net).toBe(employer.gross - employer.ndfl);
  });

  it("больничный: пособие работодателя – в день аванса, СФР – отдельной датой", () => {
    const employer = payments.find((p) => p.type === "sick-leave")!;
    const sfr = payments.find((p) => p.type === "sick-leave-sfr")!;
    const aprilAdvance = findPay(payments, "advance", 4, 2026)!;

    // Все дни больничного в первой половине апреля → пособие работодателя в день аванса.
    expect(employer.date.toString()).toBe(aprilAdvance.date.toString());
    // СФР платится отдельно (не в день аванса), но в том же месяце.
    expect(sfr.date.toString()).not.toBe(aprilAdvance.date.toString());
    expect(sfr.date.month).toBe(4);
  });

  it("больничный уменьшает только аванс апреля (вторая половина не затронута)", () => {
    const advSick = findPay(payments, "advance", 4, 2026)!.gross;
    const advClean = findPay(paymentsNoSick, "advance", 4, 2026)!.gross;
    const salSick = findPay(payments, "salary", 4, 2026)!.gross;
    const salClean = findPay(paymentsNoSick, "salary", 4, 2026)!.gross;

    // Вторая половина месяца (зарплата) не затронута больничным первой половины.
    expect(salSick).toBe(salClean);
    // Аванс уменьшен на 5 рабочих дней.
    expect(advSick).toBeLessThan(advClean);

    const workdaysApril = countWorkdays(
      ld(2026, 4, 1),
      ld(2026, 4, 30),
      calendars.get(2026)!,
    );
    const dailyRate = OKLAD_2026 / workdaysApril;
    expect(advClean - advSick).toBeCloseTo(5 * dailyRate, -3);
  });
});

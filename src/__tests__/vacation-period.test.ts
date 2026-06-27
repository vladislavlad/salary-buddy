import { describe, it, expect } from "vitest";
import type {
  Payment,
  SalaryCalculationSettings,
  Vacation,
  Bonus,
} from "@/shared/types";
import {
  PaymentsApplicationService,
  type PaymentCalculationInput,
} from "@/features/payments/model/PaymentsApplicationService";
import { localDate } from "@/shared/types/local-date";
import { loadCalendars } from "./fixtures/calendars";
import { InMemoryRepository } from "./fixtures/InMemoryRepository";

const settings: SalaryCalculationSettings = {
  advancePaymentDay: 23,
  salaryPaymentDay: 8,
  distribution: "by-worked-days",
  salaryChanges: [
    { id: "sal-1", effectiveDate: localDate(2024, 1, 1), amount: 100_000 * 100 },
  ],
};

function mkVac(
  id: string,
  start: ReturnType<typeof localDate>,
  days: number,
): Vacation {
  return {
    id,
    startDate: start,
    calendarDays: days,
    dates: Array.from({ length: days }, (_, i) => start.add({ days: i })),
    type: "paid",
  };
}

async function vacGross(vac: Vacation, bonuses: Bonus[] = []): Promise<number> {
  const repo = new InMemoryRepository<Payment>([]);
  const svc = new PaymentsApplicationService(repo);
  const input: PaymentCalculationInput = {
    settings,
    bonuses,
    surcharges: [],
    vacations: [vac],
    sickLeaves: [],
    sickLeaveSettings: { enableTopUp: false, topUpDaysLimitPerYear: 30 },
    calendars: loadCalendars(2024, 2025),
  };
  const r = await svc.recalculate(input);
  return r.find((p) => p.sourceId === vac.id && p.type === "vacation")!.gross;
}

describe("Расчётный период отпускных", () => {
  it("период привязан к месяцу отпуска: 3 мар и 15 мар дают одинаковый gross", async () => {
    const g3 = await vacGross(mkVac("v3", localDate(2025, 3, 3), 14));
    const g15 = await vacGross(mkVac("v15", localDate(2025, 3, 15), 14));
    expect(g3).toBe(g15);
  });

  it("отпуск март2025 при ровной зп 100к: gross ≈ СДЗ×14 (учтены все 12 мес)", async () => {
    const rub = (await vacGross(mkVac("v", localDate(2025, 3, 15), 14))) / 100;
    // СДЗ = 100000 / 29.3 ≈ 3413 ₽; 14 дней ≈ 47 782 ₽
    expect(rub).toBeGreaterThan(46_000);
    expect(rub).toBeLessThan(49_000);
  });

  it("доход за февраль 2025 входит в период по месяцу начисления", async () => {
    const v = mkVac("vf", localDate(2025, 3, 15), 14);
    const without = await vacGross(v);
    const withFebBonus = await vacGross(v, [
      {
        id: "b-feb",
        date: localDate(2025, 2, 10),
        type: "custom",
        amount: 300_000 * 100,
      } as Bonus,
    ]);
    expect(withFebBonus).toBeGreaterThan(without);
  });

  it("доход за март 2025 (месяц отпуска) НЕ входит в период", async () => {
    const v = mkVac("vm", localDate(2025, 3, 15), 14);
    const without = await vacGross(v);
    const withMarBonus = await vacGross(v, [
      {
        id: "b-mar",
        date: localDate(2025, 3, 20),
        type: "custom",
        amount: 300_000 * 100,
      } as Bonus,
    ]);
    expect(withMarBonus).toBe(without);
  });

  it("отпуск фев2025 учитывает доход за 2024 год", async () => {
    const rub = (await vacGross(mkVac("vfeb", localDate(2025, 2, 10), 7))) / 100;
    // 7 дней при 100к/мес ≈ 23 891 ₽ — без 2024 года было бы в разы меньше
    expect(rub).toBeGreaterThan(20_000);
    expect(rub).toBeLessThan(26_000);
  });
});

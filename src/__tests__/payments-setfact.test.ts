import { describe, it, expect } from "vitest";
import type { Payment, SalaryCalculationSettings, Vacation } from "@/shared/types";
import {
  PaymentsApplicationService,
  type PaymentCalculationInput,
} from "@/features/payments/model/PaymentsApplicationService";
import { localDate } from "@/shared/types/local-date";
import { loadCalendars } from "./fixtures/calendars";
import { InMemoryRepository } from "./fixtures/InMemoryRepository";

describe("PaymentsApplicationService.setFact", () => {
  function setup() {
    const repository = new InMemoryRepository<Payment>([]);
    const service = new PaymentsApplicationService(repository);

    const salaryAmountKop = 100_000 * 100; // 100 000 ₽ в копейках

    const settings: SalaryCalculationSettings = {
      advancePaymentDay: 23,
      salaryPaymentDay: 8,
      distribution: "by-worked-days",
      salaryChanges: [
        {
          id: "sal-1",
          effectiveDate: localDate(2026, 1, 1),
          amount: salaryAmountKop,
        },
      ],
    };

    const vacations: Vacation[] = [
      {
        id: "vac-june",
        startDate: localDate(2026, 6, 15),
        calendarDays: 7,
        dates: Array.from({ length: 7 }, (_, i) =>
          localDate(2026, 6, 15 + i),
        ),
        type: "paid",
      },
      {
        id: "vac-july",
        startDate: localDate(2026, 7, 13),
        calendarDays: 7,
        dates: Array.from({ length: 7 }, (_, i) =>
          localDate(2026, 7, 13 + i),
        ),
        type: "paid",
      },
    ];

    const input: PaymentCalculationInput = {
      settings,
      bonuses: [],
      surcharges: [],
      vacations,
      sickLeaves: [],
      sickLeaveSettings: { enableTopUp: false, topUpDaysLimitPerYear: 30 },
      calendars: loadCalendars(2026),
    };

    return { service, repository, input };
  }

  // Зарплата/аванс до начала отпуска входит в средний заработок за 12 мес,
  // поэтому установка факта на такой платёж обязана пересчитать отпускные.
  // Отпускные при этом из базы среднего заработка исключаются (ст. 922 РФ),
  // поэтому факт на самом отпуске на другой отпуск не влияет.
  function findIncomeBeforeVacation(payments: Payment[]) {
    return payments
      .filter(
        (p) =>
          (p.type === "salary" || p.type === "advance") &&
          p.date.year === 2026 &&
          p.date.month <= 5,
      )
      .sort((a, b) => a.date.month - b.date.month)[0]!;
  }

  it("setFact на зарплате до отпуска пересчитывает оба отпуска", async () => {
    const { service, input } = setup();

    // Шаг 1: первичный расчёт — оба отпуска без fact
    let payments = await service.recalculate(input);
    const juneGrossBefore = payments.find(
      (p) => p.sourceId === "vac-june" && p.type === "vacation",
    )!.gross;
    const julyGrossBefore = payments.find(
      (p) => p.sourceId === "vac-july" && p.type === "vacation",
    )!.gross;

    // Шаг 2: ставим fact на зарплату в расчётном периоде — на 50 000 ₽ больше плана
    const incomePayment = findIncomeBeforeVacation(payments);
    const FACT_GROSS = incomePayment.gross + 50_000 * 100;
    payments = await service.setFact(incomePayment.id, FACT_GROSS, input);

    // Шаг 3: факт сохранился на зарплате
    const factedAfter = payments.find((p) => p.id === incomePayment.id);
    expect(factedAfter!.fact).toBe(FACT_GROSS);

    // Шаг 4: оба отпуска пересчитались вверх — средний заработок вырос
    const juneVacAfter = payments.find(
      (p) => p.sourceId === "vac-june" && p.type === "vacation",
    )!;
    const julyVacAfter = payments.find(
      (p) => p.sourceId === "vac-july" && p.type === "vacation",
    )!;
    expect(juneVacAfter.gross).toBeGreaterThan(juneGrossBefore);
    expect(julyVacAfter.gross).toBeGreaterThan(julyGrossBefore);
  });

  it("setFact на отпуске НЕ влияет на другой отпуск (отпускные исключены из базы)", async () => {
    const { service, input } = setup();

    let payments = await service.recalculate(input);
    const juneVacBefore = payments.find(
      (p) => p.sourceId === "vac-june" && p.type === "vacation",
    )!;
    const julyGrossBefore = payments.find(
      (p) => p.sourceId === "vac-july" && p.type === "vacation",
    )!.gross;

    const FACT_GROSS = Math.floor(juneVacBefore.gross * 1.5);
    payments = await service.setFact(juneVacBefore.id, FACT_GROSS, input);

    // Отпускные не входят в средний заработок, поэтому июльский отпуск стабилен.
    const julyVacAfter = payments.find(
      (p) => p.sourceId === "vac-july" && p.type === "vacation",
    )!;
    expect(julyVacAfter.gross).toBe(julyGrossBefore);
  });

  it("getSaved во время гонки загрузки не затирает facted-платежи", async () => {
    const { service, repository, input } = setup();

    // Шаг 1: полный расчёт — отпускные платежи сохранены в репозитории.
    let payments = await service.recalculate(input);
    const juneVac = payments.find(
      (p) => p.sourceId === "vac-june" && p.type === "vacation",
    )!;
    expect(juneVac).toBeDefined();

    // Шаг 2: проставляем факт на отпуск в июне.
    const FACT_GROSS = juneVac.gross + 10_000 * 100;
    await service.setFact(juneVac.id, FACT_GROSS, input);

    // Шаг 3: симулируем гонку загрузки — не все источники готовы.
    // Провайдер вызывает getSaved() вместо recalculate(), пока sourcesReady=false.
    const returned = await service.getSaved();

    // Возвращаются сохранённые платежи без перезаписи репозитория.
    const factedInReturned = returned.find((p) => p.sourceId === "vac-june");
    expect(factedInReturned?.fact).toBe(FACT_GROSS);

    const storedDuringRace = await repository.findAll();
    const factedInStore = storedDuringRace.find(
      (p) => p.sourceId === "vac-june" && p.type === "vacation",
    );
    expect(factedInStore).toBeDefined();
    expect(factedInStore!.fact).toBe(FACT_GROSS);

    // Шаг 4: источники догрузились — полный пересчёт сохраняет факт через mergeFacts.
    payments = await service.recalculate(input);
    const juneVacAfter = payments.find(
      (p) => p.sourceId === "vac-june" && p.type === "vacation",
    )!;
    expect(juneVacAfter.fact).toBe(FACT_GROSS);
  });

  it("fact сохраняется при повторном расчёте без setFact", async () => {
    const { service, input } = setup();

    let payments = await service.recalculate(input);
    const juneVacId = payments.find(
      (p) => p.sourceId === "vac-june" && p.type === "vacation",
    )!.id;

    // Ставим fact
    await service.setFact(juneVacId, 50_000 * 100, input);

    // Пересчитываем без setFact — fact должен сохраниться через mergeFacts
    payments = await service.recalculate(input);
    const juneVacAfter = payments.find(
      (p) => p.sourceId === "vac-june" && p.type === "vacation",
    )!;

    expect(juneVacAfter.fact).toBe(50_000 * 100);
  });

  it("fact не теряется при расчёте с пустыми salaryChanges (симуляция релоада)", async () => {
    const repository = new InMemoryRepository<Payment>([]);
    const service = new PaymentsApplicationService(repository);

    const salaryAmountKop = 100_000 * 100;

    const fullSettings: SalaryCalculationSettings = {
      advancePaymentDay: 23,
      salaryPaymentDay: 8,
      distribution: "by-worked-days",
      salaryChanges: [
        {
          id: "sal-1",
          effectiveDate: localDate(2026, 1, 1),
          amount: salaryAmountKop,
        },
      ],
    };

    const emptySettings: SalaryCalculationSettings = {
      ...fullSettings,
      salaryChanges: [],
    };

    const calendars = loadCalendars(2026);

    // 1. Первичный расчёт с данными → платежи сохранены в репозитории
    await service.recalculate({
      settings: fullSettings,
      bonuses: [],
      surcharges: [],
      vacations: [],
      sickLeaves: [],
      sickLeaveSettings: { enableTopUp: false, topUpDaysLimitPerYear: 30 },
      calendars,
    });

    let stored = await repository.findAll();
    expect(stored.length).toBeGreaterThan(0);

    // 2. Ставим fact на один из платежей
    const targetPayment = stored[0]!;
    await service.setFact(targetPayment.id, 99_999 * 100);

    stored = await repository.findAll();
    const facted = stored.find((p) => p.id === targetPayment.id)!;
    expect(facted.fact).toBe(99_999 * 100);

    // 3. Симулируем релоад: salaries ещё не загружены → пустой input
    await service.recalculate({
      settings: emptySettings,
      bonuses: [],
      surcharges: [],
      vacations: [],
      sickLeaves: [],
      sickLeaveSettings: { enableTopUp: false, topUpDaysLimitPerYear: 30 },
      calendars,
    });

    // fact должен сохраниться в репозитории — пустой расчёт не перезаписал данные
    stored = await repository.findAll();
    const preserved = stored.find((p) => p.id === targetPayment.id)!;
    expect(preserved).toBeDefined();
    expect(preserved!.fact).toBe(99_999 * 100);

    // 4. После загрузки salaries — пересчёт с фактом
    const afterReload = await service.recalculate({
      settings: fullSettings,
      bonuses: [],
      surcharges: [],
      vacations: [],
      sickLeaves: [],
      sickLeaveSettings: { enableTopUp: false, topUpDaysLimitPerYear: 30 },
      calendars,
    });

    const restored = afterReload.find((p) => p.sourceId === targetPayment.sourceId)!;
    expect(restored).toBeDefined();
    expect(restored!.fact).toBe(99_999 * 100);
  });
});

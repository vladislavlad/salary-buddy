import { describe, expect, it } from "vitest";
import { BonusApplicationService } from "@/features/bonus/model/BonusApplicationService";
import { SurchargeApplicationService } from "@/features/surcharge/model/SurchargeApplicationService";
import type { Bonus, SurchargeChange } from "@/shared/types";
import { localDate } from "@/shared/types/local-date";
import { InMemoryRepository } from "./fixtures/InMemoryRepository";

describe("BonusApplicationService", () => {
  it("создаёт, обновляет и удаляет премию через repository", async () => {
    const repository = new InMemoryRepository<Bonus>();
    const service = new BonusApplicationService(repository);

    const created = await service.add({
      date: localDate(2026, 3, 1),
      amount: 100_000,
      type: "custom",
    });

    expect(created.ok).toBe(true);
    if (!created.ok) return;
    expect(await repository.findAll()).toHaveLength(1);

    const updated = await service.update({
      bonusId: created.value.id,
      amount: 200_000,
    });

    expect(updated.ok).toBe(true);
    if (!updated.ok) return;
    expect(updated.value.amount).toBe(200_000);

    await service.remove(created.value.id);
    expect(await repository.findAll()).toEqual([]);
  });

  it("возвращает ошибку при невалидной сумме", async () => {
    const service = new BonusApplicationService(
      new InMemoryRepository<Bonus>(),
    );

    const result = await service.add({
      date: localDate(2026, 3, 1),
      amount: 0,
      type: "custom",
    });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toContain("больше нуля");
  });
});

describe("SurchargeApplicationService", () => {
  it("создаёт, обновляет и удаляет доплату через repository", async () => {
    const repository = new InMemoryRepository<SurchargeChange>();
    const service = new SurchargeApplicationService(repository);

    const created = await service.add({
      effectiveDate: localDate(2026, 2, 1),
      amount: 50_000,
    });

    expect(created.ok).toBe(true);
    if (!created.ok) return;
    expect(await repository.findAll()).toHaveLength(1);

    const updated = await service.update({
      surchargeId: created.value.id,
      amount: 75_000,
    });

    expect(updated.ok).toBe(true);
    if (!updated.ok) return;
    expect(updated.value.amount).toBe(75_000);

    await service.remove(created.value.id);
    expect(await repository.findAll()).toEqual([]);
  });

  it("возвращает ошибку при невалидной сумме", async () => {
    const service = new SurchargeApplicationService(
      new InMemoryRepository<SurchargeChange>(),
    );

    const result = await service.add({
      effectiveDate: localDate(2026, 2, 1),
      amount: 0,
    });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toContain("больше нуля");
  });
});

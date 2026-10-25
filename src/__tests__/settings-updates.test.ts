import { describe, expect, it, vi } from "vitest";
import type { SalaryPaymentSettings, SickLeaveSettings } from "@/shared/types";
import { SalaryPaymentSettingsApplicationService } from "@/features/salary-payment-settings/model/SalaryPaymentSettingsApplicationService";
import { SickLeaveSettingsApplicationService } from "@/features/sick-leave/model/SickLeaveSettingsApplicationService";
import { InMemorySettingsRepository } from "./fixtures/InMemorySettingsRepository";

function settingsUpdateContract<T extends object>(
  name: string,
  createService: (repository: InMemorySettingsRepository<T>) => {
    getSettings(): Promise<T>;
    updateSettings(updates: Partial<T>): Promise<T>;
  },
  initial: T,
  first: Partial<T>,
  second: Partial<T>,
  invalid: Partial<T>,
) {
  describe(name, () => {
    it("сохраняет оба перекрывающихся частичных обновления", async () => {
      const repository = new InMemorySettingsRepository(initial);
      const service = createService(repository);

      await Promise.all([
        service.updateSettings(first),
        service.updateSettings(second),
      ]);

      expect(repository.saved).toEqual({ ...initial, ...first, ...second });
    });

    it("сериализует обновления из разных сервисов одного репозитория", async () => {
      const repository = new InMemorySettingsRepository(initial);

      await Promise.all([
        createService(repository).updateSettings(first),
        createService(repository).updateSettings(second),
      ]);

      expect(repository.saved).toEqual({ ...initial, ...first, ...second });
    });

    it("после ошибки валидации выполняет следующее обновление", async () => {
      const repository = new InMemorySettingsRepository(initial);
      const service = createService(repository);

      const results = await Promise.allSettled([
        service.updateSettings(invalid),
        service.updateSettings(second),
      ]);

      expect(results.map((result) => result.status)).toEqual([
        "rejected",
        "fulfilled",
      ]);
      expect(repository.saved).toEqual({ ...initial, ...second });
    });

    it("после ошибки записи продолжает с последнего сохранённого состояния", async () => {
      const repository = new InMemorySettingsRepository(initial);
      vi.spyOn(repository, "save").mockRejectedValueOnce(
        new Error("Ошибка записи"),
      );
      const service = createService(repository);

      const results = await Promise.allSettled([
        service.updateSettings(first),
        service.updateSettings(second),
      ]);

      expect(results.map((result) => result.status)).toEqual([
        "rejected",
        "fulfilled",
      ]);
      expect(repository.saved).toEqual({ ...initial, ...second });
    });
  });
}

settingsUpdateContract<SickLeaveSettings>(
  "SickLeaveSettingsApplicationService: очередь обновлений",
  (repository) => new SickLeaveSettingsApplicationService(repository),
  { enableTopUp: false, topUpDaysLimitPerYear: 20 },
  { enableTopUp: true },
  { topUpDaysLimitPerYear: 10 },
  { topUpDaysLimitPerYear: 0 },
);

settingsUpdateContract<SalaryPaymentSettings>(
  "SalaryPaymentSettingsApplicationService: очередь обновлений",
  (repository) => new SalaryPaymentSettingsApplicationService(repository),
  {
    advancePaymentDay: 25,
    salaryPaymentDay: 10,
    distribution: "by-worked-days",
  },
  { advancePaymentDay: 22 },
  { salaryPaymentDay: 5 },
  { advancePaymentDay: 0 },
);

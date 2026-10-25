import type { SalaryPaymentSettings } from "@/shared/types";
import { SalaryPaymentSettingsSchema } from "@/shared/types";
import { serializeRepositoryUpdate } from "@/shared/repository/serializeRepositoryUpdate";
import { DEFAULT_SALARY_PAYMENT_SETTINGS } from "./defaultSalaryPaymentSettings";
import type { SalaryPaymentSettingsRepository } from "@/features/salary-payment-settings/repository/SalaryPaymentSettingsRepository";

export class SalaryPaymentSettingsApplicationService {
  constructor(private readonly repository: SalaryPaymentSettingsRepository) {}

  async getSettings(): Promise<SalaryPaymentSettings> {
    return (await this.repository.get()) ?? DEFAULT_SALARY_PAYMENT_SETTINGS;
  }

  updateSettings(
    updates: Partial<SalaryPaymentSettings>,
  ): Promise<SalaryPaymentSettings> {
    return serializeRepositoryUpdate(this.repository, async () => {
      const current = await this.getSettings();
      const next = SalaryPaymentSettingsSchema.parse({
        ...current,
        ...updates,
      });
      await this.repository.save(next);
      return next;
    });
  }
}

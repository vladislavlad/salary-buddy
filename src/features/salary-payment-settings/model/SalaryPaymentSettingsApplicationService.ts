import type { SalaryPaymentSettings } from "@/shared/types";
import { DEFAULT_SALARY_PAYMENT_SETTINGS } from "./defaultSalaryPaymentSettings";
import type { SalaryPaymentSettingsRepository } from "@/features/salary-payment-settings/repository/SalaryPaymentSettingsRepository";

export class SalaryPaymentSettingsApplicationService {
  constructor(private readonly repository: SalaryPaymentSettingsRepository) {}

  async getSettings(): Promise<SalaryPaymentSettings> {
    return (await this.repository.get()) ?? DEFAULT_SALARY_PAYMENT_SETTINGS;
  }

  async updateSettings(
    updates: Partial<SalaryPaymentSettings>,
  ): Promise<SalaryPaymentSettings> {
    const current = await this.getSettings();
    const next = { ...current, ...updates };
    await this.repository.save(next);
    return next;
  }
}

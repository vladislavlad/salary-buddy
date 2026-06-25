import {
  SalaryPaymentSettingsSchema,
  type SalaryPaymentSettings,
} from "@/shared/types";
import type { SalaryPaymentSettingsRepository } from "./SalaryPaymentSettingsRepository";

const PAYMENT_SETTINGS_STORAGE_KEY = "salary-buddy-salary-payment-settings";

export class LocalStorageSalaryPaymentSettingsRepository implements SalaryPaymentSettingsRepository {
  async get(): Promise<SalaryPaymentSettings | null> {
    try {
      const raw = localStorage.getItem(PAYMENT_SETTINGS_STORAGE_KEY);
      if (!raw) return null;
      return SalaryPaymentSettingsSchema.parse(JSON.parse(raw));
    } catch {
      return null;
    }
  }

  async save(settings: SalaryPaymentSettings): Promise<void> {
    try {
      localStorage.setItem(
        PAYMENT_SETTINGS_STORAGE_KEY,
        JSON.stringify(settings),
      );
    } catch {
      console.warn("Не удалось сохранить настройки выплат");
    }
  }

  async clear(): Promise<void> {
    try {
      localStorage.removeItem(PAYMENT_SETTINGS_STORAGE_KEY);
    } catch {
      console.warn("Не удалось очистить настройки выплат");
    }
  }
}

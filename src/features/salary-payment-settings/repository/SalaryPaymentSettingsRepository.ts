import type { SalaryPaymentSettings } from "@/shared/types";

export interface SalaryPaymentSettingsRepository {
  get(): Promise<SalaryPaymentSettings | null>;
  save(settings: SalaryPaymentSettings): Promise<void>;
  clear(): Promise<void>;
}

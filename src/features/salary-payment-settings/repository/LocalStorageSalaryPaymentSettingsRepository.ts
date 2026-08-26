import {
  SalaryPaymentSettingsSchema,
  type SalaryPaymentSettings,
} from "@/shared/types";
import { LocalStorageSingleRepository } from "@/shared/repository/LocalStorageSingleRepository";
import type { SalaryPaymentSettingsRepository } from "./SalaryPaymentSettingsRepository";

const PAYMENT_SETTINGS_STORAGE_KEY = "salary-buddy-salary-payment-settings";

export class LocalStorageSalaryPaymentSettingsRepository
  extends LocalStorageSingleRepository<SalaryPaymentSettings>
  implements SalaryPaymentSettingsRepository
{
  constructor() {
    super(PAYMENT_SETTINGS_STORAGE_KEY, SalaryPaymentSettingsSchema);
  }
}

import { createContext } from "react";
import type { SalaryPaymentSettings } from "@/shared/types";

export interface SalaryPaymentSettingsContextValue {
  paymentSettings: SalaryPaymentSettings;
  loading: boolean;
  updatePaymentSettings: (
    updates: Partial<SalaryPaymentSettings>,
  ) => Promise<void>;
}

export const SalaryPaymentSettingsContext =
  createContext<SalaryPaymentSettingsContextValue | null>(null);

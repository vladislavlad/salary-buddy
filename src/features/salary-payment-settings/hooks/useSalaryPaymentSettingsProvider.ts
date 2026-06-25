import { useContext } from "react";
import { SalaryPaymentSettingsContext } from "@/features/salary-payment-settings/model/SalaryPaymentSettingsContext";

export function useSalaryPaymentSettingsProvider() {
  const ctx = useContext(SalaryPaymentSettingsContext);
  if (!ctx) {
    throw new Error(
      "useSalaryPaymentSettingsProvider must be used within SalaryPaymentSettingsProvider",
    );
  }
  return ctx;
}

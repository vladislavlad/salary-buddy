import type { SalaryPaymentSettings } from "@/shared/types";

export const DEFAULT_SALARY_PAYMENT_SETTINGS: SalaryPaymentSettings = {
  advancePaymentDay: 25,
  salaryPaymentDay: 10,
  distribution: "by-worked-days",
};

import { z } from "zod";
import {
  SalaryPaymentSettingsSchema,
  SalarySchema,
  BonusSchema,
  VacationSchema,
  SurchargeChangeSchema,
  PaymentSchema,
} from "@/shared/types";

export const ExportDataSchema = z.object({
  exportDate: z.string(),
  salaryPaymentSettings: SalaryPaymentSettingsSchema,
  salaries: SalarySchema.array(),
  bonuses: BonusSchema.array(),
  vacations: VacationSchema.array(),
  surcharges: SurchargeChangeSchema.array(),
  payments: PaymentSchema.array(),
});

export type ExportData = z.infer<typeof ExportDataSchema>;

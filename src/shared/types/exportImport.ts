import { OvertimeSchema } from "@/features/overtime/model/overtime";
import { z } from "zod";
import {
  SalaryPaymentSettingsSchema,
  SalarySchema,
  BonusSchema,
  VacationSchema,
  SurchargeChangeSchema,
  PaymentSchema,
  SickLeaveSchema,
  SickLeaveSettingsSchema,
  RegionalCoefficientChangeSchema,
} from "@/shared/types";

export const ExportDataSchema = z.object({
  exportDate: z.string(),
  salaryPaymentSettings: SalaryPaymentSettingsSchema,
  salaries: SalarySchema.array(),
  bonuses: BonusSchema.array(),
  overtime: OvertimeSchema.array().default([]),
  vacations: VacationSchema.array(),
  surcharges: SurchargeChangeSchema.array(),
  payments: PaymentSchema.array(),
  sickLeaves: SickLeaveSchema.array().optional().default([]),
  sickLeaveSettings: SickLeaveSettingsSchema.optional(),
  regionalCoefficients: RegionalCoefficientChangeSchema.array().optional().default([]),
});

export type ExportData = z.infer<typeof ExportDataSchema>;

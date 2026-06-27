import { z } from "zod";
import { LocalStorageRepository } from "@/shared/repository/LocalStorageRepository";
import { LocalStorageSalaryPaymentSettingsRepository } from "@/features/salary-payment-settings/repository/LocalStorageSalaryPaymentSettingsRepository";
import { LocalStorageSickLeaveSettingsRepository } from "@/features/sick-leave/repository/LocalStorageSickLeaveSettingsRepository";
import { BonusSchema, PaymentSchema, SalarySchema, SickLeaveSchema, SurchargeChangeSchema, VacationSchema } from "@/shared/types";

export const bonusRepository = new LocalStorageRepository(
  "salary-buddy-bonuses",
  z.array(BonusSchema) as z.ZodType<z.infer<typeof BonusSchema>[]>,
);
export const paymentsRepository = new LocalStorageRepository(
  "salary-buddy-payments",
  z.array(PaymentSchema) as z.ZodType<z.infer<typeof PaymentSchema>[]>,
);
export const salaryPaymentSettingsRepository =
  new LocalStorageSalaryPaymentSettingsRepository();
export const salaryRepository = new LocalStorageRepository(
  "salary-buddy-salaries",
  z.array(SalarySchema) as z.ZodType<z.infer<typeof SalarySchema>[]>,
);
export const sickLeaveRepository = new LocalStorageRepository(
  "salary-buddy-sick-leaves",
  z.array(SickLeaveSchema) as z.ZodType<z.infer<typeof SickLeaveSchema>[]>,
);
export const sickLeaveSettingsRepository =
  new LocalStorageSickLeaveSettingsRepository();
export const surchargeRepository = new LocalStorageRepository(
  "salary-buddy-surcharges",
  z.array(SurchargeChangeSchema) as z.ZodType<z.infer<typeof SurchargeChangeSchema>[]>,
);
export const vacationRepository = new LocalStorageRepository(
  "salary-buddy-vacations",
  z.array(VacationSchema) as z.ZodType<z.infer<typeof VacationSchema>[]>,
);

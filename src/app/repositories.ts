import { LocalStorageOvertimeRepository } from "@/features/overtime/repository/LocalStorageOvertimeRepository";
import { createListRepository } from "@/shared/repository/LocalStorageRepository";
import { LocalStorageCalendarSettingsRepository } from "@/features/calendar/repository/LocalStorageCalendarSettingsRepository";
import { LocalStorageSalaryPaymentSettingsRepository } from "@/features/salary-payment-settings/repository/LocalStorageSalaryPaymentSettingsRepository";
import { LocalStorageSickLeaveSettingsRepository } from "@/features/sick-leave/repository/LocalStorageSickLeaveSettingsRepository";
import {
  type Bonus,
  type Payment,
  type RegionalCoefficientChange,
  type Salary,
  type SickLeave,
  type SurchargeChange,
  type Vacation,
  BonusSchema,
  PaymentSchema,
  RegionalCoefficientChangeSchema,
  SalarySchema,
  SickLeaveSchema,
  SurchargeChangeSchema,
  VacationSchema,
} from "@/shared/types";

export const bonusRepository = createListRepository<Bonus>(
  "salary-buddy-bonuses",
  BonusSchema,
);
export const overtimeRepository = new LocalStorageOvertimeRepository();
export const paymentsRepository = createListRepository<Payment>(
  "salary-buddy-payments",
  PaymentSchema,
);
export const calendarSettingsRepository =
  new LocalStorageCalendarSettingsRepository();
export const salaryPaymentSettingsRepository =
  new LocalStorageSalaryPaymentSettingsRepository();
export const salaryRepository = createListRepository<Salary>(
  "salary-buddy-salaries",
  SalarySchema,
);
export const sickLeaveRepository = createListRepository<SickLeave>(
  "salary-buddy-sick-leaves",
  SickLeaveSchema,
);
export const sickLeaveSettingsRepository =
  new LocalStorageSickLeaveSettingsRepository();
export const surchargeRepository = createListRepository<SurchargeChange>(
  "salary-buddy-surcharges",
  SurchargeChangeSchema,
);
export const vacationRepository = createListRepository<Vacation>(
  "salary-buddy-vacations",
  VacationSchema,
);
export const regionalCoefficientRepository =
  createListRepository<RegionalCoefficientChange>(
    "salary-buddy-regional-coefficients",
    RegionalCoefficientChangeSchema,
  );

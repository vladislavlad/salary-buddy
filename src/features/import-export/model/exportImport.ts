import type { Overtime } from "@/features/overtime/model/overtime";
import { DEFAULT_SALARY_PAYMENT_SETTINGS } from "@/features/salary-payment-settings/model/defaultSalaryPaymentSettings";
import type { SalaryPaymentSettingsRepository } from "@/features/salary-payment-settings/repository/SalaryPaymentSettingsRepository";
import type { SickLeaveSettingsRepository } from "@/features/sick-leave/repository/SickLeaveSettingsRepository";
import type { Repository } from "@/shared/repository/Repository";
import type { Bonus, Payment, RegionalCoefficientChange, Salary, SickLeave, SurchargeChange, Vacation } from "@/shared/types";
import type { SickLeaveSettings } from "@/shared/types/sick-leave";
import { ExportDataSchema, type ExportData } from "@/shared/types/exportImport";

const DEFAULT_SICK_LEAVE_SETTINGS: SickLeaveSettings = {
  enableTopUp: false,
  topUpDaysLimitPerYear: 20,
};

export interface ExportImportRepositories {
  salary: Repository<Salary>;
  bonus: Repository<Bonus>;
  overtime: Repository<Overtime>;
  vacation: Repository<Vacation>;
  surcharge: Repository<SurchargeChange>;
  payment: Repository<Payment>;
  sickLeave: Repository<SickLeave>;
  regionalCoefficient: Repository<RegionalCoefficientChange>;
  salaryPaymentSettings: SalaryPaymentSettingsRepository;
  sickLeaveSettings: SickLeaveSettingsRepository;
}

/**
 * Собирает все данные из хранилищ в объект для экспорта.
 */
export async function collectExportData(repos: ExportImportRepositories): Promise<ReturnType<typeof ExportDataSchema.parse>> {
  const today = new Date();
  const exportDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

  const [salaryPaymentSettings, salaries, bonuses, overtime, vacations, surcharges, payments, sickLeaves, sickLeaveSettings, regionalCoefficients] = await Promise.all([
    repos.salaryPaymentSettings.get(),
    repos.salary.findAll(),
    repos.bonus.findAll(),
    repos.overtime.findAll(),
    repos.vacation.findAll(),
    repos.surcharge.findAll(),
    repos.payment.findAll(),
    repos.sickLeave.findAll(),
    repos.sickLeaveSettings.get(),
    repos.regionalCoefficient.findAll(),
  ]);

  return ExportDataSchema.parse({
    exportDate,
    salaryPaymentSettings: salaryPaymentSettings ?? DEFAULT_SALARY_PAYMENT_SETTINGS,
    salaries,
    bonuses,
    overtime,
    vacations,
    surcharges,
    payments,
    sickLeaves,
    sickLeaveSettings: sickLeaveSettings ?? DEFAULT_SICK_LEAVE_SETTINGS,
    regionalCoefficients,
  });
}

/**
 * Валидирует и загружает данные из JSON-файла.
 * clearAll не нужен: saveAll пишет целый массив целиком, заменяя старые
 * данные; при ошибке записи неподписанные разделы хранилища остаются нетронутыми.
 */
export async function importFromFile(file: File, repos: ExportImportRepositories): Promise<void> {
  const text = await file.text();

  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error("Файл не содержит корректный JSON");
  }

  let validated: ExportData;
  try {
    validated = ExportDataSchema.parse(parsed);
  } catch {
    throw new Error("Формат файла не совпадает с форматом данных Salary Buddy");
  }

  await Promise.all([
    repos.salaryPaymentSettings.save(validated.salaryPaymentSettings),
    repos.salary.saveAll(validated.salaries),
    repos.bonus.saveAll(validated.bonuses),
    repos.overtime.saveAll(validated.overtime),
    repos.vacation.saveAll(validated.vacations),
    repos.surcharge.saveAll(validated.surcharges),
    repos.payment.saveAll(validated.payments),
    repos.sickLeave.saveAll(validated.sickLeaves),
    repos.sickLeaveSettings.save(validated.sickLeaveSettings ?? DEFAULT_SICK_LEAVE_SETTINGS),
    repos.regionalCoefficient.saveAll(validated.regionalCoefficients),
  ]);
}

/**
 * Очищает все хранилища.
 */
export async function clearAll(repos: ExportImportRepositories): Promise<void> {
  await Promise.all([
    repos.salary.clear(),
    repos.bonus.clear(),
    repos.overtime.clear(),
    repos.vacation.clear(),
    repos.surcharge.clear(),
    repos.payment.clear(),
    repos.sickLeave.clear(),
    repos.salaryPaymentSettings.clear(),
    repos.sickLeaveSettings.clear(),
    repos.regionalCoefficient.clear(),
  ]);
}

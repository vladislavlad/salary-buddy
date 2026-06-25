import {
  loadSalaryPaymentSettings,
  saveSalaryPaymentSettings,
  loadSalaries,
  saveSalaries,
  loadBonuses,
  saveBonuses,
  loadVacations,
  saveVacations,
  loadSurcharges,
  saveSurcharges,
  loadPayments,
  savePayments,
  clearAll,
} from "@/features/import-export/model/storage";
import { DEFAULT_SALARY_PAYMENT_SETTINGS } from "@/features/salary-payment-settings/model/defaultSalaryPaymentSettings";
import { ExportDataSchema } from "@/shared/types/exportImport";

/**
 * Собирает все данные из хранилищ в объект для экспорта.
 */
export async function collectExportData(): Promise<ReturnType<typeof ExportDataSchema.parse>> {
  const today = new Date();
  const exportDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

  const [salaryPaymentSettings, salaries, bonuses, vacations, surcharges, payments] = await Promise.all([
    loadSalaryPaymentSettings(),
    loadSalaries(),
    loadBonuses(),
    loadVacations(),
    loadSurcharges(),
    loadPayments(),
  ]);

  return ExportDataSchema.parse({
    exportDate,
    salaryPaymentSettings: salaryPaymentSettings ?? DEFAULT_SALARY_PAYMENT_SETTINGS,
    salaries,
    bonuses,
    vacations,
    surcharges,
    payments,
  });
}

/**
 * Валидирует и загружает данные из JSON-файла.
 * Перед записью очищает текущие значения в хранилище.
 */
export async function importFromFile(file: File): Promise<void> {
  const text = await file.text();
  const parsed = JSON.parse(text);

  const validated = ExportDataSchema.parse(parsed);

  await clearAll();

  await Promise.all([
    saveSalaryPaymentSettings(validated.salaryPaymentSettings),
    saveSalaries(validated.salaries),
    saveBonuses(validated.bonuses),
    saveVacations(validated.vacations),
    saveSurcharges(validated.surcharges),
    savePayments(validated.payments),
  ]);
}

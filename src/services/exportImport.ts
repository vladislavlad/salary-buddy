import { loadSettings, saveSettings, loadBonuses, saveBonuses, loadVacations, saveVacations, loadFacts, saveFacts, clearAll } from '@/services/storage';
import type { SalarySettings } from '@/types';
import { ExportDataSchema } from '@/types/exportImport';

const DEFAULT_SETTINGS: SalarySettings = {
  advancePaymentDay: 15,
  salaryPaymentDay: 28,
  distribution: 'by-worked-days',
  salaryChanges: [],
};

/**
 * Собирает все данные из localStorage в объект для экспорта.
 */
export function collectExportData(): ReturnType<typeof ExportDataSchema.parse> {
  const today = new Date();
  const exportDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

  return ExportDataSchema.parse({
    exportDate,
    settings: loadSettings() ?? DEFAULT_SETTINGS,
    bonuses: loadBonuses(),
    vacations: loadVacations(),
    facts: loadFacts() ?? {},
  });
}

/**
 * Валидирует и загружает данные из JSON-файла.
 * Перед записью очищает текущие значения в сторе.
 */
export async function importFromFile(file: File): Promise<void> {
  const text = await file.text();
  const parsed = JSON.parse(text);

  const validated = ExportDataSchema.parse(parsed);

  clearAll();

  saveSettings(validated.settings);
  saveBonuses(validated.bonuses);
  saveVacations(validated.vacations);
  saveFacts(validated.facts);
}

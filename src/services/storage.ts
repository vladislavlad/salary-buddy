import type { SalarySettings, Bonus, Vacation } from '@/types';
import { SalarySettingsSchema, BonusSchema, VacationSchema } from '@/types';

const SETTINGS_KEY = 'salary-buddy-settings';
const BONUSES_KEY = 'salary-buddy-bonuses';
const VACATIONS_KEY = 'salary-buddy-vacations';
const FACTS_KEY = 'salary-buddy-facts';

export const STORAGE_KEYS = [SETTINGS_KEY, BONUSES_KEY, VACATIONS_KEY, FACTS_KEY];

/**
 * Сохраняет настройки зарплаты в localStorage.
 */
export function saveSettings(settings: SalarySettings): void {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch {
    console.warn('Не удалось сохранить настройки');
  }
}

/**
 * Загружает настройки зарплаты из localStorage.
 * Мигрирует старый формат (salary: number) в новый (salaryChanges: []).
 */
export function loadSettings(): SalarySettings | null {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return null;

    let parsed = JSON.parse(raw);

    // Миграция: старый формат с salary -> salaryChanges + rename полей
    if ('salary' in parsed && !('salaryChanges' in parsed)) {
      parsed = {
        advancePaymentDay: parsed.advanceDay ?? 15,
        salaryPaymentDay: parsed.salaryDay ?? 28,
        distribution: parsed.distribution ?? 'by-worked-days',
        salaryChanges: [],
      };
      saveSettings(parsed as SalarySettings);
    }

    return SalarySettingsSchema.parse(parsed);
  } catch {
    return null;
  }
}

/**
 * Сохраняет список премий в localStorage.
 */
export function saveBonuses(bonuses: Bonus[]): void {
  try {
    localStorage.setItem(BONUSES_KEY, JSON.stringify(bonuses));
  } catch {
    console.warn('Не удалось сохранить премии');
  }
}

/**
 * Загружает список премий из localStorage.
 */
export function loadBonuses(): Bonus[] {
  try {
    const raw = localStorage.getItem(BONUSES_KEY);
    if (!raw) return [];

    const parsed = JSON.parse(raw);
    return BonusSchema.array().parse(parsed);
  } catch {
    return [];
  }
}

/**
 * Сохраняет список отпусков в localStorage.
 */
export function saveVacations(vacations: Vacation[]): void {
  try {
    localStorage.setItem(VACATIONS_KEY, JSON.stringify(vacations));
  } catch {
    console.warn('Не удалось сохранить отпуска');
  }
}

/**
 * Загружает список отпусков из localStorage.
 */
export function loadVacations(): Vacation[] {
  try {
    const raw = localStorage.getItem(VACATIONS_KEY);
    if (!raw) return [];

    return VacationSchema.array().parse(JSON.parse(raw));
  } catch {
    return [];
  }
}

/**
 * Сохраняет фактические суммы выплат в localStorage.
 */
export function saveFacts(facts: Record<string, number>): void {
  try {
    localStorage.setItem(FACTS_KEY, JSON.stringify(facts));
  } catch {
    console.warn('Не удалось сохранить факты');
  }
}

/**
 * Загружает фактические суммы выплат из localStorage.
 */
export function loadFacts(): Record<string, number> | null {
  try {
    const raw = localStorage.getItem(FACTS_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) return {};
    return parsed as Record<string, number>;
  } catch {
    return {};
  }
}

/**
 * Очищает все ключи Salary Buddy из localStorage.
 */
export function clearAll(): void {
  STORAGE_KEYS.forEach(k => localStorage.removeItem(k));
}

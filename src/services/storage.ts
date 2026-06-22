import type { SalarySettings, Bonus } from '@/types';
import { SalarySettingsSchema } from '@/types';

const SETTINGS_KEY = 'salary-buddy-settings';
const BONUSES_KEY = 'salary-buddy-bonuses';

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
 */
export function loadSettings(): SalarySettings | null {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw);
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
    return parsed as Bonus[];
  } catch {
    return [];
  }
}

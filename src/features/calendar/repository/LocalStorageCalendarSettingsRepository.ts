import {
  CalendarSettingsSchema,
  type CalendarSettings,
} from "@/shared/types";
import type { CalendarSettingsRepository } from "./CalendarSettingsRepository";

const CALENDAR_SETTINGS_STORAGE_KEY = "salary-buddy-calendar-settings";

export class LocalStorageCalendarSettingsRepository
  implements CalendarSettingsRepository
{
  async get(): Promise<CalendarSettings | null> {
    try {
      const raw = localStorage.getItem(CALENDAR_SETTINGS_STORAGE_KEY);
      if (!raw) return null;
      return CalendarSettingsSchema.parse(JSON.parse(raw));
    } catch {
      return null;
    }
  }

  async save(settings: CalendarSettings): Promise<void> {
    try {
      localStorage.setItem(
        CALENDAR_SETTINGS_STORAGE_KEY,
        JSON.stringify(settings),
      );
    } catch {
      console.warn("Не удалось сохранить настройки календаря");
    }
  }

  async clear(): Promise<void> {
    try {
      localStorage.removeItem(CALENDAR_SETTINGS_STORAGE_KEY);
    } catch {
      console.warn("Не удалось очистить настройки календаря");
    }
  }
}

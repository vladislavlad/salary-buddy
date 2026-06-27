import { SickLeaveSettingsSchema, type SickLeaveSettings } from "@/shared/types/sick-leave";
import type { SickLeaveSettingsRepository } from "./SickLeaveSettingsRepository";

const SICK_LEAVE_SETTINGS_STORAGE_KEY = "salary-buddy-sick-leave-settings";

export class LocalStorageSickLeaveSettingsRepository implements SickLeaveSettingsRepository {
  async get(): Promise<SickLeaveSettings | null> {
    try {
      const raw = localStorage.getItem(SICK_LEAVE_SETTINGS_STORAGE_KEY);
      if (!raw) return null;
      return SickLeaveSettingsSchema.parse(JSON.parse(raw));
    } catch {
      return null;
    }
  }

  async save(settings: SickLeaveSettings): Promise<void> {
    try {
      localStorage.setItem(
        SICK_LEAVE_SETTINGS_STORAGE_KEY,
        JSON.stringify(settings),
      );
    } catch {
      console.warn("Не удалось сохранить настройки больничных");
    }
  }

  async clear(): Promise<void> {
    try {
      localStorage.removeItem(SICK_LEAVE_SETTINGS_STORAGE_KEY);
    } catch {
      console.warn("Не удалось очистить настройки больничных");
    }
  }
}

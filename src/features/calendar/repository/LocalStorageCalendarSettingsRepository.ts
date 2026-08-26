import {
  CalendarSettingsSchema,
  type CalendarSettings,
} from "@/shared/types";
import { LocalStorageSingleRepository } from "@/shared/repository/LocalStorageSingleRepository";
import type { CalendarSettingsRepository } from "./CalendarSettingsRepository";

const CALENDAR_SETTINGS_STORAGE_KEY = "salary-buddy-calendar-settings";

export class LocalStorageCalendarSettingsRepository
  extends LocalStorageSingleRepository<CalendarSettings>
  implements CalendarSettingsRepository
{
  constructor() {
    super(CALENDAR_SETTINGS_STORAGE_KEY, CalendarSettingsSchema);
  }
}

import type { CalendarSettings } from "@/shared/types";

export interface CalendarSettingsRepository {
  get(): Promise<CalendarSettings | null>;
  save(settings: CalendarSettings): Promise<void>;
  clear(): Promise<void>;
}

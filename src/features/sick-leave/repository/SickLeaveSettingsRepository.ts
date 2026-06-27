import type { SickLeaveSettings } from "@/shared/types/sick-leave";

export interface SickLeaveSettingsRepository {
  get(): Promise<SickLeaveSettings | null>;
  save(settings: SickLeaveSettings): Promise<void>;
  clear(): Promise<void>;
}

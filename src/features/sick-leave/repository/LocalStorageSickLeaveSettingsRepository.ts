import { SickLeaveSettingsSchema, type SickLeaveSettings } from "@/shared/types/sick-leave";
import { LocalStorageSingleRepository } from "@/shared/repository/LocalStorageSingleRepository";
import type { SickLeaveSettingsRepository } from "./SickLeaveSettingsRepository";

const SICK_LEAVE_SETTINGS_STORAGE_KEY = "salary-buddy-sick-leave-settings";

export class LocalStorageSickLeaveSettingsRepository
  extends LocalStorageSingleRepository<SickLeaveSettings>
  implements SickLeaveSettingsRepository
{
  constructor() {
    super(SICK_LEAVE_SETTINGS_STORAGE_KEY, SickLeaveSettingsSchema);
  }
}

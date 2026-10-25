import type { SickLeaveSettings } from "@/shared/types/sick-leave";
import { SickLeaveSettingsSchema } from "@/shared/types/sick-leave";
import type { SickLeaveSettingsRepository } from "../repository/SickLeaveSettingsRepository";
import { serializeRepositoryUpdate } from "@/shared/repository/serializeRepositoryUpdate";

// Значения по умолчанию – из zod-схемы (enableTopUp: false, topUpDaysLimitPerYear: 20)
export const DEFAULT_SICK_LEAVE_SETTINGS: SickLeaveSettings =
  SickLeaveSettingsSchema.parse({});

export class SickLeaveSettingsApplicationService {
  constructor(private readonly repository: SickLeaveSettingsRepository) {}

  async getSettings(): Promise<SickLeaveSettings> {
    return (await this.repository.get()) ?? DEFAULT_SICK_LEAVE_SETTINGS;
  }

  updateSettings(
    updates: Partial<SickLeaveSettings>,
  ): Promise<SickLeaveSettings> {
    return serializeRepositoryUpdate(this.repository, async () => {
      const current = await this.getSettings();
      const next = SickLeaveSettingsSchema.parse({ ...current, ...updates });
      await this.repository.save(next);
      return next;
    });
  }
}

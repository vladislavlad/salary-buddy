import type { CalendarData } from "@/shared/types";
import type { SickLeave, SickLeaveCreateRequest, SickLeaveUpdateRequest } from "@/shared/types/sick-leave";
import { createSickLeave, updateSickLeave } from "./sickLeaveRules";
import type { SickLeaveRepository } from "@/features/sick-leave/repository/SickLeaveRepository";
import type { Result } from "@/shared/result";
import type { SickLeaveService } from "./SickLeaveService";

export class SickLeaveApplicationService implements SickLeaveService {
  constructor(
    private readonly repository: SickLeaveRepository,
    private readonly calendars: ReadonlyMap<number, CalendarData>,
  ) {}

  async findAll(): Promise<SickLeave[]> {
    return this.repository.findAll();
  }

  async add(req: SickLeaveCreateRequest): Promise<Result<SickLeave>> {
    const sickLeaves = await this.repository.findAll();
    const result = createSickLeave(sickLeaves, req, this.calendars);
    if (!result.ok) return result;

    await this.repository.save(result.value);
    return result;
  }

  async update(req: SickLeaveUpdateRequest): Promise<Result<SickLeave>> {
    const existing = await this.repository.findById(req.sickLeaveId);
    if (!existing) {
      return { ok: false, error: "Больничный не найден" };
    }

    const result = updateSickLeave(existing, req, this.calendars);
    if (!result.ok) return result;

    await this.repository.save(result.value);
    return result;
  }

  async remove(sickLeaveId: string): Promise<void> {
    const sickLeaves = await this.repository.findAll();
    await this.repository.saveAll(
      sickLeaves.filter((sickLeave) => sickLeave.id !== sickLeaveId),
    );
  }
}

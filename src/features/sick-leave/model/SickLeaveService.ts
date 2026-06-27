import type { SickLeave, SickLeaveCreateRequest, SickLeaveUpdateRequest } from "@/shared/types/sick-leave";
import type { Result } from "@/shared/result";

export interface SickLeaveService {
  findAll(): Promise<SickLeave[]>;
  add(req: SickLeaveCreateRequest): Promise<Result<SickLeave>>;
  update(req: SickLeaveUpdateRequest): Promise<Result<SickLeave>>;
  remove(sickLeaveId: string): Promise<void>;
}

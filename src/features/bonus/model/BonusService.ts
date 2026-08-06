import type { Bonus, BonusCreateRequest, BonusUpdateRequest } from "@/shared/types";
import type { Result } from "@/shared/result";

export interface BonusService {
  findAll(): Promise<Bonus[]>;
  add(req: BonusCreateRequest): Promise<Result<Bonus>>;
  update(req: BonusUpdateRequest): Promise<Result<Bonus>>;
  remove(bonusId: string): Promise<void>;
}

import type { SurchargeChange, SurchargeCreateRequest, SurchargeUpdateRequest } from "@/shared/types";
import type { Result } from "@/shared/result";

export interface SurchargeService {
  findAll(): Promise<SurchargeChange[]>;
  add(req: SurchargeCreateRequest): Promise<Result<SurchargeChange>>;
  update(req: SurchargeUpdateRequest): Promise<Result<SurchargeChange>>;
  remove(surchargeId: string): Promise<void>;
}

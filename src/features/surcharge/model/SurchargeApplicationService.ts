import type {
  SurchargeChange,
  SurchargeCreateRequest,
  SurchargeUpdateRequest,
} from "@/shared/types";
import type { Result } from "@/shared/result";
import { createSurcharge, updateSurcharge } from "./surchargeRules";
import type { SurchargeRepository } from "@/features/surcharge/repository/SurchargeRepository";

export class SurchargeApplicationService {
  constructor(private readonly repository: SurchargeRepository) {}

  findAll(): Promise<SurchargeChange[]> {
    return this.repository.findAll();
  }

  async add(req: SurchargeCreateRequest): Promise<Result<SurchargeChange>> {
    const result = createSurcharge(req);
    if (!result.ok) return result;

    await this.repository.save(result.value);
    return result;
  }

  async update(req: SurchargeUpdateRequest): Promise<Result<SurchargeChange>> {
    const existing = await this.repository.findById(req.surchargeId);
    if (!existing) return { ok: false, error: "Доплата не найдена" };

    const result = updateSurcharge(existing, req);
    if (!result.ok) return result;

    await this.repository.save(result.value);
    return result;
  }

  async remove(surchargeId: string): Promise<void> {
    const surcharges = await this.repository.findAll();
    await this.repository.saveAll(
      surcharges.filter((surcharge) => surcharge.id !== surchargeId),
    );
  }
}

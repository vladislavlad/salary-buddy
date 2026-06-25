import type {
  Bonus,
  BonusCreateRequest,
  BonusUpdateRequest,
} from "@/shared/types";
import { createBonus, updateBonus } from "./bonusRules";
import type { BonusRepository } from "@/features/bonus/repository/BonusRepository";
import type { Result } from "@/shared/result";

export class BonusApplicationService {
  constructor(private readonly repository: BonusRepository) {}

  findAll(): Promise<Bonus[]> {
    return this.repository.findAll();
  }

  async add(req: BonusCreateRequest): Promise<Result<Bonus>> {
    const bonuses = await this.repository.findAll();
    const result = createBonus(bonuses, req);
    if (!result.ok) return result;

    await this.repository.save(result.value);
    return result;
  }

  async update(req: BonusUpdateRequest): Promise<Result<Bonus>> {
    const existing = await this.repository.findById(req.bonusId);
    if (!existing) return { ok: false, error: "Премия не найдена" };

    const result = updateBonus(existing, req);
    if (!result.ok) return result;

    await this.repository.save(result.value);
    return result;
  }

  async remove(bonusId: string): Promise<void> {
    const bonuses = await this.repository.findAll();
    await this.repository.saveAll(
      bonuses.filter((bonus) => bonus.id !== bonusId),
    );
  }
}

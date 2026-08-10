import type { Repository } from "@/shared/repository/Repository";
import type {
  RegionalCoefficientChange,
  RegionalCoefficientCreateRequest,
  RegionalCoefficientUpdateRequest,
} from "@/shared/types";
import type { Result } from "@/shared/result";
import {
  createRegionalCoefficient,
  updateRegionalCoefficient,
} from "./regionalCoefficientRules";
import type { RegionalCoefficientService } from "./RegionalCoefficientService";

export class RegionalCoefficientApplicationService
  implements RegionalCoefficientService
{
  constructor(
    private readonly repository: Repository<RegionalCoefficientChange>,
  ) {}

  findAll(): Promise<RegionalCoefficientChange[]> {
    return this.repository.findAll();
  }

  async add(
    req: RegionalCoefficientCreateRequest,
  ): Promise<Result<RegionalCoefficientChange>> {
    const result = createRegionalCoefficient(req);
    if (!result.ok) return result;

    await this.repository.save(result.value);
    return result;
  }

  async update(
    req: RegionalCoefficientUpdateRequest,
  ): Promise<Result<RegionalCoefficientChange>> {
    const existing = await this.repository.findById(req.coefficientId);
    if (!existing)
      return { ok: false, error: "Районный коэффициент не найден" };

    const result = updateRegionalCoefficient(existing, req);
    if (!result.ok) return result;

    await this.repository.save(result.value);
    return result;
  }

  async remove(coefficientId: string): Promise<void> {
    const coefficients = await this.repository.findAll();
    await this.repository.saveAll(
      coefficients.filter((c) => c.id !== coefficientId),
    );
  }
}

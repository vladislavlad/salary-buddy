import type {
  RegionalCoefficientChange,
  RegionalCoefficientCreateRequest,
  RegionalCoefficientUpdateRequest,
} from "@/shared/types";
import type { Result } from "@/shared/result";

export interface RegionalCoefficientService {
  findAll(): Promise<RegionalCoefficientChange[]>;
  add(
    req: RegionalCoefficientCreateRequest,
  ): Promise<Result<RegionalCoefficientChange>>;
  update(
    req: RegionalCoefficientUpdateRequest,
  ): Promise<Result<RegionalCoefficientChange>>;
  remove(coefficientId: string): Promise<void>;
}

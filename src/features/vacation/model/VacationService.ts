import type {
  Vacation,
  VacationCreateRequest,
  VacationUpdateRequest,
} from "@/shared/types/vacation";
import type { Result } from "@/shared/result";

export interface VacationService {
  findAll(): Promise<Vacation[]>;
  add(req: VacationCreateRequest): Promise<Result<Vacation>>;
  update(req: VacationUpdateRequest): Promise<Result<Vacation>>;
  remove(vacationId: string): Promise<void>;
}

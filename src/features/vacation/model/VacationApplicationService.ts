import type { CalendarData } from "@/shared/types";
import type {
  Vacation,
  VacationCreateRequest,
  VacationUpdateRequest,
} from "@/shared/types/vacation";
import { createVacation, updateVacation } from "./vacationRules";
import type { VacationRepository } from "@/features/vacation/repository/VacationRepository";
import type { Result } from "@/shared/result";
import type { VacationService } from "./VacationService";

export class VacationApplicationService implements VacationService {
  constructor(
    private readonly repository: VacationRepository,
    private readonly calendars: ReadonlyMap<number, CalendarData>,
  ) {}

  async findAll(): Promise<Vacation[]> {
    return this.repository.findAll();
  }

  async add(req: VacationCreateRequest): Promise<Result<Vacation>> {
    const vacations = await this.repository.findAll();
    const result = createVacation(vacations, req, this.calendars);
    if (!result.ok) return result;

    await this.repository.save(result.value);
    return result;
  }

  async update(req: VacationUpdateRequest): Promise<Result<Vacation>> {
    const existing = await this.repository.findById(req.vacationId);
    if (!existing) {
      return { ok: false, error: "Отпуск не найден" };
    }

    const result = updateVacation(existing, req, this.calendars);
    if (!result.ok) return result;

    await this.repository.save(result.value);
    return result;
  }

  async remove(vacationId: string): Promise<void> {
    const vacations = await this.repository.findAll();
    await this.repository.saveAll(
      vacations.filter((vacation) => vacation.id !== vacationId),
    );
  }
}

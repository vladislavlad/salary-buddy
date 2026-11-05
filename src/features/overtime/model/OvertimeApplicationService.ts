import type { Repository } from "@/shared/repository/Repository";
import { serializeRepositoryUpdate } from "@/shared/repository/serializeRepositoryUpdate";
import type { Result } from "@/shared/result";
import {
  OvertimeInputSchema,
  type Overtime,
  type OvertimeInput,
} from "./overtime";

export class OvertimeApplicationService {
  constructor(private readonly repository: Repository<Overtime>) {}

  findAll(): Promise<Overtime[]> {
    return this.repository.findAll();
  }

  async save(input: OvertimeInput, id?: string): Promise<Result<Overtime>> {
    const parsed = OvertimeInputSchema.safeParse(input);
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      return {
        ok: false,
        error:
          issue?.path[0] === "hours"
            ? "Укажите количество часов больше 0 и не больше 24"
            : issue?.path[0] === "date"
              ? issue.message
              : "Выберите ставку ×1, ×2 или ×3",
      };
    }

    return serializeRepositoryUpdate(this.repository, async () => {
      if (id !== undefined && !(await this.repository.findById(id))) {
        return { ok: false, error: "Переработка не найдена" };
      }

      const overtime = {
        ...parsed.data,
        id: id ?? `ot:${crypto.randomUUID()}`,
      };
      await this.repository.save(overtime);
      return { ok: true, value: overtime };
    });
  }

  remove(id: string): Promise<void> {
    return serializeRepositoryUpdate(this.repository, async () => {
      const entries = await this.repository.findAll();
      await this.repository.saveAll(entries.filter((entry) => entry.id !== id));
    });
  }
}

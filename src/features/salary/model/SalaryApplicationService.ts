import type { Repository } from "@/shared/repository/Repository";
import type { Salary } from "@/shared/types";
import type { SalaryService } from "./SalaryService";

export class SalaryApplicationService implements SalaryService {
  constructor(private readonly repository: Repository<Salary>) {}

  findAll(): Promise<Salary[]> {
    return this.repository.findAll();
  }

  async saveAll(salaries: Salary[]): Promise<Salary[]> {
    await this.repository.saveAll(salaries);
    return this.repository.findAll();
  }
}

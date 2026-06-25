import type { Salary } from "@/shared/types";
import type { SalaryRepository } from "@/features/salary/repository/SalaryRepository";

export class SalaryApplicationService {
  constructor(private readonly repository: SalaryRepository) {}

  findAll(): Promise<Salary[]> {
    return this.repository.findAll();
  }

  async saveAll(salaries: Salary[]): Promise<Salary[]> {
    await this.repository.saveAll(salaries);
    return this.repository.findAll();
  }
}

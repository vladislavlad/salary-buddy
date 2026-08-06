import type { Salary } from "@/shared/types";

export interface SalaryService {
  findAll(): Promise<Salary[]>;
  saveAll(salaries: Salary[]): Promise<Salary[]>;
}

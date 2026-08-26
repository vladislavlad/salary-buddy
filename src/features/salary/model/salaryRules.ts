import type { Salary } from "@/shared/types";
import { nextSequenceId } from "@/shared/lib/ids";

// ID оклада по шаблону sal:{year}:{seq} из спеки storage;
// год — год даты вступления в силу.
export function generateSalaryId(salaries: Salary[], year: number): string {
  return nextSequenceId("sal:", year, salaries.map((salary) => salary.id));
}

import { createContext } from "react";
import type { Salary } from "@/shared/types";

export interface SalaryContextValue {
  salaries: Salary[];
  loading: boolean;
  setSalaries: (salaries: Salary[]) => Promise<void>;
}

export const SalaryContext = createContext<SalaryContextValue | null>(null);

import { useContext } from "react";
import { SalaryContext } from "@/features/salary/model/SalaryContext";

export function useSalaryProvider() {
  const salaryCtx = useContext(SalaryContext);
  if (!salaryCtx) {
    throw new Error("useSalaryProvider must be used within SalaryProvider");
  }

  return salaryCtx;
}

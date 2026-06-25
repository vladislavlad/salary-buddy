import { SalaryContext } from "./SalaryContext";
import { useSalaryService } from "@/features/salary/hooks/useSalaryService";

export function SalaryProvider({ children }: { children: React.ReactNode }) {
  const service = useSalaryService();
  return (
    <SalaryContext.Provider value={service}>
      {children}
    </SalaryContext.Provider>
  );
}

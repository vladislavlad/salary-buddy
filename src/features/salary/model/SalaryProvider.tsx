import { SalaryContext } from "./SalaryContext";
import { useSalaryService } from "@/features/salary/hooks/useSalaryService";
import type { Salary } from "@/shared/types";
import type { Repository } from "@/shared/repository/Repository";

export function SalaryProvider({
  children,
  repository,
}: {
  children: React.ReactNode;
  repository: Repository<Salary, string>;
}) {
  const service = useSalaryService(repository);
  return (
    <SalaryContext.Provider value={service}>{children}</SalaryContext.Provider>
  );
}

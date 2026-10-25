import { VacationsContext } from "./VacationContext";
import { useVacations } from "@/features/vacation/hooks/useVacations";
import type { Vacation } from "@/shared/types";
import type { Repository } from "@/shared/repository/Repository";

export function VacationsProvider({
  children,
  repository,
}: {
  children: React.ReactNode;
  repository: Repository<Vacation, string>;
}) {
  const service = useVacations(repository);
  return (
    <VacationsContext.Provider value={service}>
      {children}
    </VacationsContext.Provider>
  );
}

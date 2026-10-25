import { BonusesContext } from "./BonusContext";
import { useBonusesService } from "@/features/bonus/hooks/useBonuses";
import type { Bonus } from "@/shared/types";
import type { Repository } from "@/shared/repository/Repository";

export function BonusesProvider({
  children,
  repository,
}: {
  children: React.ReactNode;
  repository: Repository<Bonus, string>;
}) {
  const service = useBonusesService(repository);
  return (
    <BonusesContext.Provider value={service}>
      {children}
    </BonusesContext.Provider>
  );
}

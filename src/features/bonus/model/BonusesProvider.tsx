import { BonusesContext } from "./BonusContext";
import { useBonusesService } from "@/features/bonus/hooks/useBonuses";

export function BonusesProvider({ children }: { children: React.ReactNode }) {
  const service = useBonusesService();
  return (
    <BonusesContext.Provider value={service}>
      {children}
    </BonusesContext.Provider>
  );
}

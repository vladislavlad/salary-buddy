import { createContext } from "react";
import type {
  Bonus,
  BonusCreateRequest,
  BonusUpdateRequest,
} from "@/shared/types";
import type { Result } from "@/shared/result";

export interface BonusesContextValue {
  bonuses: Bonus[];
  loading: boolean;
  addBonus: (req: BonusCreateRequest) => Promise<Result<Bonus>>;
  updateBonus: (req: BonusUpdateRequest) => Promise<Result<Bonus>>;
  removeBonus: (bonusId: string) => Promise<void>;
}

export const BonusesContext = createContext<BonusesContextValue | null>(null);

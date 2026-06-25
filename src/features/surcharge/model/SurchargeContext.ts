import { createContext } from "react";
import type {
  SurchargeChange,
  SurchargeCreateRequest,
  SurchargeUpdateRequest,
} from "@/shared/types";
import type { Result } from "@/shared/result";

export interface SurchargeContextValue {
  surcharges: SurchargeChange[];
  loading: boolean;
  addSurcharge: (
    req: SurchargeCreateRequest,
  ) => Promise<Result<SurchargeChange>>;
  updateSurcharge: (
    req: SurchargeUpdateRequest,
  ) => Promise<Result<SurchargeChange>>;
  removeSurcharge: (surchargeId: string) => Promise<void>;
}

export const SurchargeContext = createContext<SurchargeContextValue | null>(
  null,
);

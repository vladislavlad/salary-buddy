import { createContext } from "react";
import type {
  RegionalCoefficientChange,
  RegionalCoefficientCreateRequest,
  RegionalCoefficientUpdateRequest,
} from "@/shared/types";
import type { Result } from "@/shared/result";

export interface RegionalCoefficientContextValue {
  coefficients: RegionalCoefficientChange[];
  loading: boolean;
  addCoefficient: (
    req: RegionalCoefficientCreateRequest,
  ) => Promise<Result<RegionalCoefficientChange>>;
  updateCoefficient: (
    req: RegionalCoefficientUpdateRequest,
  ) => Promise<Result<RegionalCoefficientChange>>;
  removeCoefficient: (coefficientId: string) => Promise<void>;
}

export const RegionalCoefficientContext =
  createContext<RegionalCoefficientContextValue | null>(null);

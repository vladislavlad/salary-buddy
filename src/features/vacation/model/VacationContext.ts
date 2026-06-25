import { createContext } from "react";
import type {
  Vacation,
  VacationCreateRequest,
  VacationUpdateRequest,
} from "@/shared/types";
import type { Result } from "@/shared/result";

export interface VacationsContextValue {
  vacations: Vacation[];
  loading: boolean;
  error: string | null;
  reload: () => Promise<void>;
  addVacation: (req: VacationCreateRequest) => Promise<Result<Vacation>>;
  updateVacation: (req: VacationUpdateRequest) => Promise<Result<Vacation>>;
  removeVacation: (vacationId: string) => Promise<void>;
}

export const VacationsContext = createContext<VacationsContextValue | null>(
  null,
);

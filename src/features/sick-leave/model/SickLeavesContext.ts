import { createContext } from "react";
import type { SickLeave, SickLeaveCreateRequest, SickLeaveUpdateRequest, SickLeaveSettings } from "@/shared/types/sick-leave";
import type { Result } from "@/shared/result";

export interface SickLeavesContextValue {
  sickLeaves: SickLeave[];
  settings: SickLeaveSettings;
  loading: boolean;
  error: string | null;
  reload: () => Promise<void>;
  addSickLeave: (req: SickLeaveCreateRequest) => Promise<Result<SickLeave>>;
  updateSickLeave: (req: SickLeaveUpdateRequest) => Promise<Result<SickLeave>>;
  removeSickLeave: (sickLeaveId: string) => Promise<void>;
  updateSettings: (settings: Partial<SickLeaveSettings>) => Promise<void>;
}

export const SickLeavesContext = createContext<SickLeavesContextValue | null>(null);

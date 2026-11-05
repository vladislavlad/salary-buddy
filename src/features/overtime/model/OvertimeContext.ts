import { createContext } from "react";
import type { useOvertimeService } from "../hooks/useOvertime";

export const OvertimeContext = createContext<ReturnType<
  typeof useOvertimeService
> | null>(null);

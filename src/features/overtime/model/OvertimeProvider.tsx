import type { ReactNode } from "react";
import type { Repository } from "@/shared/repository/Repository";
import { useOvertimeService } from "../hooks/useOvertime";
import { OvertimeContext } from "./OvertimeContext";
import type { Overtime } from "./overtime";

export function OvertimeProvider({
  children,
  repository,
}: {
  children: ReactNode;
  repository: Repository<Overtime>;
}) {
  const value = useOvertimeService(repository);
  return (
    <OvertimeContext.Provider value={value}>
      {children}
    </OvertimeContext.Provider>
  );
}

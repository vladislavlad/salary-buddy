import { SickLeavesContext } from "./SickLeavesContext";
import { useSickLeaves } from "@/features/sick-leave/hooks/useSickLeaves";
import type { SickLeaveServiceFactory } from "@/features/sick-leave/hooks/useSickLeaves";
import { sickLeaveRepository, sickLeaveSettingsRepository } from "@/app/repositories";
import { SickLeaveApplicationService } from "./SickLeaveApplicationService";

import type { CalendarData } from "@/shared/types";

const defaultCreateService: SickLeaveServiceFactory = (
  calendars: ReadonlyMap<number, CalendarData>,
) => new SickLeaveApplicationService(sickLeaveRepository, calendars);

export function SickLeavesProvider({
  children,
  createService,
}: {
  children: React.ReactNode;
  createService?: SickLeaveServiceFactory;
}) {
  const service = useSickLeaves(createService ?? defaultCreateService, sickLeaveSettingsRepository);
  return (
    <SickLeavesContext.Provider value={service}>
      {children}
    </SickLeavesContext.Provider>
  );
}

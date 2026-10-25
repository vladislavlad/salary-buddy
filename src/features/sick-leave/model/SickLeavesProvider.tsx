import { SickLeavesContext } from "./SickLeavesContext";
import { useSickLeaves } from "@/features/sick-leave/hooks/useSickLeaves";
import type { SickLeave } from "@/shared/types";
import type { Repository } from "@/shared/repository/Repository";
import type { SickLeaveSettingsRepository } from "../repository/SickLeaveSettingsRepository";

export function SickLeavesProvider({
  children,
  repository,
  settingsRepository,
}: {
  children: React.ReactNode;
  repository: Repository<SickLeave, string>;
  settingsRepository: SickLeaveSettingsRepository;
}) {
  const service = useSickLeaves(repository, settingsRepository);
  return (
    <SickLeavesContext.Provider value={service}>
      {children}
    </SickLeavesContext.Provider>
  );
}

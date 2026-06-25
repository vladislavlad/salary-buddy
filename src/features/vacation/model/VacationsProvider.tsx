import { VacationsContext } from "./VacationContext";
import {
  useVacations,
  type VacationServiceFactory,
} from "@/features/vacation/hooks/useVacations";
import { vacationRepository } from "@/app/repositories";
import { VacationApplicationService } from "@/features/vacation/model/VacationApplicationService";

const defaultCreateService: VacationServiceFactory = (calendars) =>
  new VacationApplicationService(vacationRepository, calendars);

export function VacationsProvider({
  children,
  createService,
}: {
  children: React.ReactNode;
  createService?: VacationServiceFactory;
}) {
  const service = useVacations(createService ?? defaultCreateService);
  return (
    <VacationsContext.Provider value={service}>
      {children}
    </VacationsContext.Provider>
  );
}

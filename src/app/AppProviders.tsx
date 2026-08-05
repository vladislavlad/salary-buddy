import type { ExportImportRepositories } from "@/features/import-export/model/exportImport";
import { ExportImportRepositoriesProvider } from "@/features/import-export/model/ExportImportRepositoriesProvider";
import { TooltipProvider } from "@/shared/ui/tooltip";
import { BonusesProvider } from "@/features/bonus/model/BonusesProvider";
import { CalendarProvider } from "@/features/calendar/model/CalendarProvider";
import { PaymentsProvider } from "@/features/payments/model/PaymentsProvider";
import { SalaryPaymentSettingsProvider } from "@/features/salary-payment-settings/model/SalaryPaymentSettingsProvider";
import { SalaryProvider } from "@/features/salary/model/SalaryProvider";
import { SickLeavesProvider } from "@/features/sick-leave/model/SickLeavesProvider";
import { SurchargeProvider } from "@/features/surcharge/model/SurchargeProvider";
import { VacationsProvider } from "@/features/vacation/model/VacationsProvider";
import {
  bonusRepository,
  paymentsRepository,
  salaryPaymentSettingsRepository,
  salaryRepository,
  sickLeaveRepository,
  sickLeaveSettingsRepository,
  surchargeRepository,
  vacationRepository,
} from "@/app/repositories";

const exportImportRepos: ExportImportRepositories = {
  salary: salaryRepository,
  bonus: bonusRepository,
  vacation: vacationRepository,
  surcharge: surchargeRepository,
  payment: paymentsRepository,
  sickLeave: sickLeaveRepository,
  salaryPaymentSettings: salaryPaymentSettingsRepository,
  sickLeaveSettings: sickLeaveSettingsRepository,
};

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <ExportImportRepositoriesProvider value={exportImportRepos}>
      <CalendarProvider>
        <SalaryPaymentSettingsProvider>
          <SalaryProvider>
            <SurchargeProvider>
              <BonusesProvider>
                <VacationsProvider>
                  <SickLeavesProvider>
                    <PaymentsProvider>
                      <TooltipProvider delayDuration={200}>
                        {children}
                      </TooltipProvider>
                    </PaymentsProvider>
                  </SickLeavesProvider>
                </VacationsProvider>
              </BonusesProvider>
            </SurchargeProvider>
          </SalaryProvider>
        </SalaryPaymentSettingsProvider>
      </CalendarProvider>
    </ExportImportRepositoriesProvider>
  );
}

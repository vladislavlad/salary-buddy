import type { ExportImportRepositories } from "@/features/import-export/model/exportImport";
import { ExportImportRepositoriesProvider } from "@/features/import-export/model/ExportImportRepositoriesProvider";
import { TooltipProvider } from "@/shared/ui/tooltip";
import { BonusesProvider } from "@/features/bonus/model/BonusesProvider";
import { CalendarProvider } from "@/features/calendar/model/CalendarProvider";
import { CalendarSettingsProvider } from "@/features/calendar/model/CalendarSettingsProvider";
import { OvertimeProvider } from "@/features/overtime/model/OvertimeProvider";
import { PaymentsProvider } from "@/features/payments/model/PaymentsProvider";
import { RegionalCoefficientProvider } from "@/features/regional-coefficient/model/RegionalCoefficientProvider";
import { SalaryPaymentSettingsProvider } from "@/features/salary-payment-settings/model/SalaryPaymentSettingsProvider";
import { SalaryProvider } from "@/features/salary/model/SalaryProvider";
import { SickLeavesProvider } from "@/features/sick-leave/model/SickLeavesProvider";
import { SurchargeProvider } from "@/features/surcharge/model/SurchargeProvider";
import { VacationsProvider } from "@/features/vacation/model/VacationsProvider";
import {
  bonusRepository,
  calendarSettingsRepository,
  overtimeRepository,
  paymentsRepository,
  regionalCoefficientRepository,
  salaryPaymentSettingsRepository,
  salaryRepository,
  sickLeaveRepository,
  sickLeaveSettingsRepository,
  surchargeRepository,
  vacationRepository,
} from "@/app/repositories";

// Единственная точка сборки репозиториев: фичи получают их пропсами,
// напрямую на app-слой не зависят.
const exportImportRepos: ExportImportRepositories = {
  salary: salaryRepository,
  bonus: bonusRepository,
  overtime: overtimeRepository,
  vacation: vacationRepository,
  surcharge: surchargeRepository,
  payment: paymentsRepository,
  sickLeave: sickLeaveRepository,
  regionalCoefficient: regionalCoefficientRepository,
  salaryPaymentSettings: salaryPaymentSettingsRepository,
  sickLeaveSettings: sickLeaveSettingsRepository,
};

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <ExportImportRepositoriesProvider value={exportImportRepos}>
      <CalendarSettingsProvider repository={calendarSettingsRepository}>
        <CalendarProvider>
          <SalaryPaymentSettingsProvider
            repository={salaryPaymentSettingsRepository}
          >
            <SalaryProvider repository={salaryRepository}>
              <SurchargeProvider repository={surchargeRepository}>
                <RegionalCoefficientProvider
                  repository={regionalCoefficientRepository}
                >
                  <BonusesProvider repository={bonusRepository}>
                    <VacationsProvider repository={vacationRepository}>
                      <SickLeavesProvider
                        repository={sickLeaveRepository}
                        settingsRepository={sickLeaveSettingsRepository}
                      >
                        <OvertimeProvider repository={overtimeRepository}>
                          <PaymentsProvider repository={paymentsRepository}>
                            <TooltipProvider delayDuration={200}>
                              {children}
                            </TooltipProvider>
                          </PaymentsProvider>
                        </OvertimeProvider>
                      </SickLeavesProvider>
                    </VacationsProvider>
                  </BonusesProvider>
                </RegionalCoefficientProvider>
              </SurchargeProvider>
            </SalaryProvider>
          </SalaryPaymentSettingsProvider>
        </CalendarProvider>
      </CalendarSettingsProvider>
    </ExportImportRepositoriesProvider>
  );
}

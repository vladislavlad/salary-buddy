import { TooltipProvider } from "@/shared/ui/tooltip";
import { BonusesProvider } from "@/features/bonus/model/BonusesProvider";
import { CalendarProvider } from "@/features/calendar/model/CalendarProvider";
import { PaymentsProvider } from "@/features/payments/model/PaymentsProvider";
import { SalaryPaymentSettingsProvider } from "@/features/salary-payment-settings/model/SalaryPaymentSettingsProvider";
import { SalaryProvider } from "@/features/salary/model/SalaryProvider";
import { SurchargeProvider } from "@/features/surcharge/model/SurchargeProvider";
import { VacationsProvider } from "@/features/vacation/model/VacationsProvider";

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <CalendarProvider>
      <SalaryPaymentSettingsProvider>
        <SalaryProvider>
          <SurchargeProvider>
            <BonusesProvider>
              <VacationsProvider>
                <PaymentsProvider>
                  <TooltipProvider delayDuration={200}>
                    {children}
                  </TooltipProvider>
                </PaymentsProvider>
              </VacationsProvider>
            </BonusesProvider>
          </SurchargeProvider>
        </SalaryProvider>
      </SalaryPaymentSettingsProvider>
    </CalendarProvider>
  );
}

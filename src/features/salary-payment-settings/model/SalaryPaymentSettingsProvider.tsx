import { SalaryPaymentSettingsContext } from "./SalaryPaymentSettingsContext";
import { useSalaryPaymentSettingsService } from "@/features/salary-payment-settings/hooks/useSalaryPaymentSettingsService";

export function SalaryPaymentSettingsProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const service = useSalaryPaymentSettingsService();
  return (
    <SalaryPaymentSettingsContext.Provider value={service}>
      {children}
    </SalaryPaymentSettingsContext.Provider>
  );
}

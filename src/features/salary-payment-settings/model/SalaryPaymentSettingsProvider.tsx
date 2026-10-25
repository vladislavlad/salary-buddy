import { SalaryPaymentSettingsContext } from "./SalaryPaymentSettingsContext";
import { useSalaryPaymentSettingsService } from "@/features/salary-payment-settings/hooks/useSalaryPaymentSettingsService";
import type { SalaryPaymentSettingsRepository } from "@/features/salary-payment-settings/repository/SalaryPaymentSettingsRepository";

export function SalaryPaymentSettingsProvider({
  children,
  repository,
}: {
  children: React.ReactNode;
  repository: SalaryPaymentSettingsRepository;
}) {
  const service = useSalaryPaymentSettingsService(repository);
  return (
    <SalaryPaymentSettingsContext.Provider value={service}>
      {children}
    </SalaryPaymentSettingsContext.Provider>
  );
}

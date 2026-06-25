import { useCallback, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { SalaryPaymentSettings } from "@/shared/types";
import { salaryPaymentSettingsRepository } from "@/app/repositories";
import { DEFAULT_SALARY_PAYMENT_SETTINGS } from "@/features/salary-payment-settings/model/defaultSalaryPaymentSettings";
import { SalaryPaymentSettingsApplicationService } from "@/features/salary-payment-settings/model/SalaryPaymentSettingsApplicationService";

export const SALARY_PAYMENT_SETTINGS_QUERY_KEY = [
  "salary-payment-settings",
] as const;

export function useSalaryPaymentSettingsService(): {
  paymentSettings: SalaryPaymentSettings;
  loading: boolean;
  updatePaymentSettings: (
    updates: Partial<SalaryPaymentSettings>,
  ) => Promise<void>;
} {
  const queryClient = useQueryClient();
  const service = useMemo(
    () =>
      new SalaryPaymentSettingsApplicationService(
        salaryPaymentSettingsRepository,
      ),
    [],
  );

  const { data: paymentSettings = DEFAULT_SALARY_PAYMENT_SETTINGS, isLoading } =
    useQuery({
      queryKey: SALARY_PAYMENT_SETTINGS_QUERY_KEY,
      queryFn: () => service.getSettings(),
    });

  const updatePaymentSettings = useCallback(
    async (updates: Partial<SalaryPaymentSettings>) => {
      await service.updateSettings(updates);
      await queryClient.invalidateQueries({
        queryKey: SALARY_PAYMENT_SETTINGS_QUERY_KEY,
      });
    },
    [service, queryClient],
  );

  return { paymentSettings, loading: isLoading, updatePaymentSettings };
}

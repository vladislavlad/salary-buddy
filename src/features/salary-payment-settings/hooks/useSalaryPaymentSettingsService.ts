import { useCallback, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  LOCAL_QUERY_KEY,
  LOCAL_QUERY_OPTIONS,
} from "@/shared/query/localQuery";
import type { SalaryPaymentSettings } from "@/shared/types";
import type { SalaryPaymentSettingsRepository } from "@/features/salary-payment-settings/repository/SalaryPaymentSettingsRepository";
import { DEFAULT_SALARY_PAYMENT_SETTINGS } from "@/features/salary-payment-settings/model/defaultSalaryPaymentSettings";
import { SalaryPaymentSettingsApplicationService } from "@/features/salary-payment-settings/model/SalaryPaymentSettingsApplicationService";

export const SALARY_PAYMENT_SETTINGS_QUERY_KEY = [
  ...LOCAL_QUERY_KEY,
  "salary-payment-settings",
] as const;

export function useSalaryPaymentSettingsService(
  repository: SalaryPaymentSettingsRepository,
): {
  paymentSettings: SalaryPaymentSettings;
  loading: boolean;
  updatePaymentSettings: (
    updates: Partial<SalaryPaymentSettings>,
  ) => Promise<void>;
} {
  const queryClient = useQueryClient();
  const service = useMemo(
    () => new SalaryPaymentSettingsApplicationService(repository),
    [repository],
  );

  const { data: paymentSettings = DEFAULT_SALARY_PAYMENT_SETTINGS, isFetching } =
    useQuery({
      ...LOCAL_QUERY_OPTIONS,
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

  return { paymentSettings, loading: isFetching, updatePaymentSettings };
}

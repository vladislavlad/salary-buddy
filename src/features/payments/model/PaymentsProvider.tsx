import { useCallback, useEffect, useMemo, useState } from "react";
import { useSalaryProvider } from "@/features/salary/hooks/useSalaryProvider";
import { useSalaryPaymentSettingsProvider } from "@/features/salary-payment-settings/hooks/useSalaryPaymentSettingsProvider";
import { useBonusesProvider } from "@/features/bonus/hooks/useBonusesProvider";
import { useVacationsProvider } from "@/features/vacation/hooks/useVacationsProvider";
import { useSickLeavesProvider } from "@/features/sick-leave/hooks/useSickLeavesProvider";
import { useSurchargeProvider } from "@/features/surcharge/hooks/useSurchargeProvider";
import { useRegionalCoefficientProvider } from "@/features/regional-coefficient/hooks/useRegionalCoefficientProvider";
import { useCalendar } from "@/features/calendar/hooks/useCalendar";
import type { Payment } from "@/shared/types";
import type { Repository } from "@/shared/repository/Repository";
import { PaymentsContext } from "./PaymentsContext";
import {
  PaymentsApplicationService,
  type PaymentCalculationInput,
} from "./PaymentsApplicationService";

export function PaymentsProvider({
  children,
  repository,
}: {
  children: React.ReactNode;
  repository: Repository<Payment, string>;
}) {
  const { salaries, loading: salariesLoading } = useSalaryProvider();
  const { paymentSettings, loading: settingsLoading } =
    useSalaryPaymentSettingsProvider();
  const { bonuses, loading: bonusesLoading } = useBonusesProvider();
  const { surcharges, loading: surchargesLoading } = useSurchargeProvider();
  const { coefficients, loading: coefficientsLoading } =
    useRegionalCoefficientProvider();
  const { vacations, loading: vacationsLoading } = useVacationsProvider();
  const {
    sickLeaves,
    settings: sickLeaveSettings,
    loading: sickLeavesLoading,
  } = useSickLeavesProvider();
  const { calendars, isLoading: calendarLoading } = useCalendar();
  const [payments, setPayments] = useState<Payment[]>([]);

  // Перезаписывающий пересчёт допустим только когда ВСЕ источники загружены.
  // Иначе частичный input затрёт facted-платежи ещё не загруженных источников.
  const sourcesReady =
    !salariesLoading &&
    !settingsLoading &&
    !bonusesLoading &&
    !surchargesLoading &&
    !coefficientsLoading &&
    !vacationsLoading &&
    !sickLeavesLoading &&
    !calendarLoading;

  const service = useMemo(
    () => new PaymentsApplicationService(repository),
    [repository],
  );

  const input: PaymentCalculationInput = useMemo(
    () => ({
      settings: {
        ...paymentSettings,
        salaryChanges: salaries,
      },
      bonuses,
      surcharges,
      regionalCoefficients: coefficients,
      vacations,
      sickLeaves,
      sickLeaveSettings,
      calendars,
    }),
    [
      paymentSettings,
      salaries,
      bonuses,
      surcharges,
      coefficients,
      vacations,
      sickLeaves,
      sickLeaveSettings,
      calendars,
    ],
  );

  useEffect(() => {
    // Пока не все источники загружены, отдаём сохранённое без перезаписи –
    // иначе частичный input затрёт facted-платежи ещё не загруженных источников.
    const result = sourcesReady
      ? service.recalculate(input)
      : service.getSaved();
    result.then(setPayments);
  }, [input, service, sourcesReady]);

  const setFact = useCallback(
    async (paymentId: string, factGross?: number) => {
      const result = await service.setFact(paymentId, factGross, input);
      setPayments(result);
    },
    [service, input],
  );

  const value = useMemo(() => ({ payments, setFact }), [payments, setFact]);

  return (
    <PaymentsContext.Provider value={value}>
      {children}
    </PaymentsContext.Provider>
  );
}

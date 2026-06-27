import { useCallback, useEffect, useMemo, useState } from "react";
import { useSalaryProvider } from "@/features/salary/hooks/useSalaryProvider";
import { useSalaryPaymentSettingsProvider } from "@/features/salary-payment-settings/hooks/useSalaryPaymentSettingsProvider";
import { useBonusesProvider } from "@/features/bonus/hooks/useBonusesProvider";
import { useVacationsProvider } from "@/features/vacation/hooks/useVacationsProvider";
import { useSickLeavesProvider } from "@/features/sick-leave/hooks/useSickLeavesProvider";
import { useSurchargeProvider } from "@/features/surcharge/hooks/useSurchargeProvider";
import { useCalendar } from "@/features/calendar/hooks/useCalendar.ts";
import type { Payment } from "@/shared/types";
import { PaymentsContext } from "./PaymentsContext";
import { paymentsRepository } from "@/app/repositories";
import {
  PaymentsApplicationService,
  type PaymentCalculationInput,
} from "./PaymentsApplicationService";

export function PaymentsProvider({ children }: { children: React.ReactNode }) {
  const { salaries, loading: salariesLoading } = useSalaryProvider();
  const { paymentSettings, loading: settingsLoading } =
    useSalaryPaymentSettingsProvider();
  const { bonuses, loading: bonusesLoading } = useBonusesProvider();
  const { surcharges, loading: surchargesLoading } = useSurchargeProvider();
  const { vacations, loading: vacationsLoading } = useVacationsProvider();
  const { sickLeaves, settings: sickLeaveSettings, loading: sickLeavesLoading } = useSickLeavesProvider();
  const { calendars, isLoading: calendarLoading } = useCalendar();
  const [payments, setPayments] = useState<Payment[]>([]);

  // Перезаписывающий пересчёт допустим только когда ВСЕ источники загружены.
  // Иначе частичный input затрёт facted-платежи ещё не загруженных источников.
  const sourcesReady =
    !salariesLoading &&
    !settingsLoading &&
    !bonusesLoading &&
    !surchargesLoading &&
    !vacationsLoading &&
    !sickLeavesLoading &&
    !calendarLoading;

  const service = useMemo(
    () => new PaymentsApplicationService(paymentsRepository),
    [],
  );

  const input: PaymentCalculationInput = useMemo(
    () => ({
      settings: {
        ...paymentSettings,
        salaryChanges: salaries,
      },
      bonuses,
      surcharges,
      vacations,
      sickLeaves,
      sickLeaveSettings,
      calendars,
    }),
    [paymentSettings, salaries, bonuses, surcharges, vacations, sickLeaves, sickLeaveSettings, calendars],
  );

  useEffect(() => {
    // Пока не все источники загружены, отдаём сохранённое без перезаписи —
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

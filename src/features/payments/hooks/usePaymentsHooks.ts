import { useContext } from "react";
import type { Payment, CalendarData } from "@/shared/types";
import { PaymentsContext } from "@/features/payments/model/PaymentsContext";
import { useCalendar } from "@/features/calendar/hooks/useCalendar.ts";

export function usePaymentsForYear(year: number): Payment[] {
  const ctx = useContext(PaymentsContext);
  if (!ctx) return [];
  return ctx.payments.filter((p) => p.date.year === year);
}

export function useCalendarForYear(year: number): CalendarData | null {
  const { calendars } = useCalendar();
  return calendars.get(year) ?? null;
}

export function usePaymentsStore() {
  const ctx = useContext(PaymentsContext);
  if (!ctx)
    throw new Error("usePaymentsStore must be used within PaymentsProvider");
  return ctx;
}

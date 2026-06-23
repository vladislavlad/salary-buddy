import { useContext } from 'react';
import type { YearCalculation, CalendarData } from '@/types';
import { PaymentsContext } from '@/context/contexts';

export function usePaymentsForYear(year: number): YearCalculation | null {
  const ctx = useContext(PaymentsContext);
  if (!ctx) return null;
  return ctx.calculations.get(year) ?? null;
}

export function useCalendarForYear(year: number): CalendarData | null {
  const ctx = useContext(PaymentsContext);
  if (!ctx) return null;
  return ctx.calendars.get(year) ?? null;
}

export function usePaymentsStore() {
  const ctx = useContext(PaymentsContext);
  if (!ctx) throw new Error('usePaymentsStore must be used within PaymentsProvider');
  return ctx;
}

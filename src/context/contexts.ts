import { createContext } from 'react';
import type { Bonus, Vacation, SalarySettings, YearCalculation, CalendarData } from '@/types';

interface BonusesContextValue {
  bonuses: Bonus[];
  addBonus: (bonus: Omit<Bonus, 'id'>) => void;
  updateBonus: (id: string, data: Partial<Omit<Bonus, 'id'>>) => void;
  removeBonus: (id: string) => void;
}

interface VacationsContextValue {
  vacations: Vacation[];
  addVacation: (vacation: Omit<Vacation, 'id'>) => void;
  updateVacation: (id: string, data: Partial<Omit<Vacation, 'id'>>) => void;
  removeVacation: (id: string) => void;
}

interface SalaryContextValue {
  settings: SalarySettings;
  updateSettings: (updates: Partial<SalarySettings>) => void;
}

interface PaymentsContextValue {
  calculations: Map<number, YearCalculation>;
  calendars: Map<number, CalendarData>;
  isLoading: boolean;
  displayYears: number[];
}

interface FactsContextValue {
  facts: Record<string, number>; // paymentId -> factGross
  setFact: (paymentId: string, factGross?: number) => void;
}

export const BonusesContext = createContext<BonusesContextValue | null>(null);
export const VacationsContext = createContext<VacationsContextValue | null>(null);
export const SalaryContext = createContext<SalaryContextValue | null>(null);
export const PaymentsContext = createContext<PaymentsContextValue | null>(null);
export const FactsContext = createContext<FactsContextValue | null>(null);

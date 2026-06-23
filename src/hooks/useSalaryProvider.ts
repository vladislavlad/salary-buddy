import { useContext } from 'react';
import { SalaryContext } from '@/context/contexts';

export function useSalaryProvider() {
  const ctx = useContext(SalaryContext);
  if (!ctx) throw new Error('useSalaryProvider must be used within SalaryProvider');
  return ctx;
}

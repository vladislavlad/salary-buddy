import { useContext } from 'react';
import { VacationsContext } from '@/context/contexts';

export function useVacationsProvider() {
  const ctx = useContext(VacationsContext);
  if (!ctx) throw new Error('useVacationsProvider must be used within VacationsProvider');
  return ctx;
}

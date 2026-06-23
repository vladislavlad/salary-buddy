import { useContext } from 'react';
import { BonusesContext } from '@/context/contexts';

export function useBonusesProvider() {
  const ctx = useContext(BonusesContext);
  if (!ctx) throw new Error('useBonusesProvider must be used within BonusesProvider');
  return ctx;
}

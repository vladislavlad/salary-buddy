import { useContext } from 'react';
import { FactsContext } from '@/context/contexts';

export function useFactsProvider() {
  const ctx = useContext(FactsContext);
  if (!ctx) throw new Error('useFactsProvider must be used within FactsProvider');
  return ctx;
}

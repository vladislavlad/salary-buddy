import { useCallback } from 'react';
import { loadFacts, saveFacts } from '@/services/storage';
import { FactsContext } from './contexts';
import { usePersistedState } from '@/hooks/usePersistedState';

export function FactsProvider({ children }: { children: React.ReactNode }) {
  const [facts, setFacts] = usePersistedState(loadFacts, saveFacts, {});

  const setFact = useCallback((paymentId: string, factGross?: number) => {
    setFacts(prev => {
      const next = { ...prev };
      if (factGross === undefined) {
        delete next[paymentId];
      } else {
        next[paymentId] = factGross;
      }
      return next;
    });
  }, [setFacts]);

  return (
    <FactsContext.Provider value={{ facts, setFact }}>
      {children}
    </FactsContext.Provider>
  );
}

import { useCallback } from 'react';
import type { Vacation } from '@/types';
import { loadVacations, saveVacations } from '@/services/storage';
import { VacationsContext } from './contexts';
import { usePersistedState } from '@/hooks/usePersistedState';

function generateVacationId(vacations: Vacation[], year: number): string {
  const count = vacations.filter(v => v.startDate.getFullYear() === year).length + 1;
  return `vac:${year}:${String(count).padStart(2, '0')}`;
}

export function VacationsProvider({ children }: { children: React.ReactNode }) {
  const [vacations, setVacations] = usePersistedState(loadVacations, saveVacations, []);

  const addVacation = useCallback((data: Omit<Vacation, 'id'>) => {
    const year = data.startDate.getFullYear();
    setVacations(prev => [...prev, { ...data, id: generateVacationId(prev, year) }]);
  }, [setVacations]);

  const updateVacation = useCallback((id: string, data: Partial<Omit<Vacation, 'id'>>) => {
    setVacations(prev => prev.map(v => v.id === id ? { ...v, ...data } : v));
  }, [setVacations]);

  const removeVacation = useCallback((id: string) => {
    setVacations(prev => prev.filter(v => v.id !== id));
  }, [setVacations]);

  return (
    <VacationsContext.Provider value={{ vacations, addVacation, updateVacation, removeVacation }}>
      {children}
    </VacationsContext.Provider>
  );
}
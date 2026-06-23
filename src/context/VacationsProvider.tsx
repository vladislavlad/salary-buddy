import { useCallback } from 'react';
import type { Vacation, VacationSettings } from '@/types';
import { loadVacations, saveVacations, loadVacationSettings, saveVacationSettings } from '@/services/storage';
import { VacationsContext } from './contexts';
import { usePersistedState } from '@/hooks/usePersistedState';

/** Генерирует ID вида vac:{year}:{seq} */
function generateVacationId(vacations: Vacation[], year: number): string {
  const count = vacations.filter(v => v.startDate.getFullYear() === year).length + 1;
  return `vac:${year}:${String(count).padStart(2, '0')}`;
}

export function VacationsProvider({ children }: { children: React.ReactNode }) {
  const [vacations, setVacations] = usePersistedState(loadVacations, saveVacations, []);
  const [vacationSettings, setVacationSettings] = usePersistedState(loadVacationSettings, saveVacationSettings, {});

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

  const updateVacationSettings = useCallback((partial: Partial<VacationSettings>) => {
    setVacationSettings(prev => ({ ...prev, ...partial }));
  }, [setVacationSettings]);

  return (
    <VacationsContext.Provider value={{ vacations, addVacation, updateVacation, removeVacation, vacationSettings, updateVacationSettings }}>
      {children}
    </VacationsContext.Provider>
  );
}

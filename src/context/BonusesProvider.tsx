import { useCallback } from 'react';
import type { Bonus } from '@/types';
import { loadBonuses, saveBonuses } from '@/services/storage';
import { BonusesContext } from './contexts';
import { usePersistedState } from '@/hooks/usePersistedState';

/** Генерирует ID вида bon:{year}:{seq} */
function generateBonusId(bonuses: Bonus[], year: number): string {
  const count = bonuses.filter(b => b.date.getFullYear() === year).length + 1;
  return `bon:${year}:${String(count).padStart(2, '0')}`;
}

export function BonusesProvider({ children }: { children: React.ReactNode }) {
  const [bonuses, setBonuses] = usePersistedState(loadBonuses, saveBonuses, []);

  const addBonus = useCallback((data: Omit<Bonus, 'id'>) => {
    const year = data.date.getFullYear();
    setBonuses(prev => [...prev, { ...data, id: generateBonusId(prev, year) }]);
  }, [setBonuses]);

  const updateBonus = useCallback((id: string, data: Partial<Omit<Bonus, 'id'>>) => {
    setBonuses(prev => prev.map(b => b.id === id ? { ...b, ...data } : b));
  }, [setBonuses]);

  const removeBonus = useCallback((id: string) => {
    setBonuses(prev => prev.filter(b => b.id !== id));
  }, [setBonuses]);

  return (
    <BonusesContext.Provider value={{ bonuses, addBonus, updateBonus, removeBonus }}>
      {children}
    </BonusesContext.Provider>
  );
}

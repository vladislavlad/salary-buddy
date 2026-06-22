import { useState, useCallback } from 'react';
import type { Bonus } from '@/types';
import { loadBonuses, saveBonuses } from '@/services/storage';

export function useBonuses() {
  const [bonuses, setBonuses] = useState<Bonus[]>(() => loadBonuses());

  const addBonus = useCallback((bonus: Omit<Bonus, 'id'>) => {
    setBonuses((prev) => {
      const next = [...prev, { ...bonus, id: crypto.randomUUID() }];
      saveBonuses(next);
      return next;
    });
  }, []);

  const removeBonus = useCallback((id: string) => {
    setBonuses((prev) => {
      const next = prev.filter((b) => b.id !== id);
      saveBonuses(next);
      return next;
    });
  }, []);

  return { bonuses, addBonus, removeBonus };
}

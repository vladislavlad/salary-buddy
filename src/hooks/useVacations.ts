import { useState, useCallback } from 'react';
import type { Vacation } from '@/types';
import { loadVacations, saveVacations } from '@/services/storage';

export function useVacations() {
  const [vacations, setVacations] = useState<Vacation[]>(() => loadVacations());

  const addVacation = useCallback((vacation: Omit<Vacation, 'id'>) => {
    setVacations((prev) => {
      const next = [...prev, { ...vacation, id: crypto.randomUUID() }];
      saveVacations(next);
      return next;
    });
  }, []);

  const removeVacation = useCallback((id: string) => {
    setVacations((prev) => {
      const next = prev.filter((v) => v.id !== id);
      saveVacations(next);
      return next;
    });
  }, []);

  return { vacations, addVacation, removeVacation };
}

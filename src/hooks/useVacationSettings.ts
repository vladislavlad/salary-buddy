import { useState, useCallback } from 'react';
import type { VacationSettings } from '@/types';
import { loadVacationSettings, saveVacationSettings } from '@/services/storage';

export function useVacationSettings() {
  const [settings, setSettings] = useState<VacationSettings>(() => loadVacationSettings() ?? {});

  const updateSettings = useCallback((partial: Partial<VacationSettings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...partial };
      saveVacationSettings(next);
      return next;
    });
  }, []);

  return { settings, updateSettings };
}

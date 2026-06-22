import { useState, useCallback } from 'react';
import type { SalarySettings } from '@/types';
import { loadSettings, saveSettings } from '@/services/storage';

const defaultSettings: SalarySettings = {
  salary: 100000,
  advanceDay: 15,
  salaryDay: 28,
  distribution: 'by-worked-days',
};

export function useSettings() {
  const [settings, setSettings] = useState<SalarySettings>(() => loadSettings() ?? defaultSettings);

  const updateSettings = useCallback((updates: Partial<SalarySettings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...updates };
      saveSettings(next);
      return next;
    });
  }, []);

  return { settings, updateSettings };
}

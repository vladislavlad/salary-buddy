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
  const [settings, setSettings] = useState<SalarySettings | null>(() => loadSettings());

  const updateSettings = useCallback((updates: Partial<SalarySettings>) => {
    setSettings((prev) => {
      if (!prev) return null;
      const next = { ...prev, ...updates };
      saveSettings(next);
      return next;
    });
  }, []);

  const initializeSettings = useCallback(() => {
    const loaded = loadSettings();
    setSettings(loaded ?? defaultSettings);
    if (!loaded) {
      saveSettings(defaultSettings);
    }
  }, []);

  return { settings, updateSettings, initializeSettings };
}

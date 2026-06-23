import { useCallback } from 'react';
import type { SalarySettings } from '@/types';
import { loadSettings, saveSettings } from '@/services/storage';
import { SalaryContext } from './contexts';
import { usePersistedState } from '@/hooks/usePersistedState';

const defaultSettings: SalarySettings = {
  advancePaymentDay: 25,
  salaryPaymentDay: 10,
  distribution: 'by-worked-days',
  salaryChanges: [],
};

export function SalaryProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = usePersistedState(loadSettings, saveSettings, defaultSettings);

  const updateSettings = useCallback((updates: Partial<SalarySettings>) => {
    setSettings(prev => ({ ...prev, ...updates }));
  }, [setSettings]);

  return (
    <SalaryContext.Provider value={{ settings, updateSettings }}>
      {children}
    </SalaryContext.Provider>
  );
}

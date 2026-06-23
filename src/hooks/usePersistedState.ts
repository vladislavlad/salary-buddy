import { useCallback, useState } from 'react';

/**
 * Создаёт персистентное состояние с автосохранением в localStorage.
 */
export function usePersistedState<T>(loadFn: () => T | null, saveFn: (val: T) => void, defaultValue: T): [T, (updater: (prev: T) => T) => void] {
  const [state, setState] = useState<T>(() => loadFn() ?? defaultValue);

  const persistSetState = useCallback((updater: (prev: T) => T) => {
    setState(prev => {
      const next = updater(prev);
      saveFn(next);
      return next;
    });
  }, [saveFn]);

  return [state, persistSetState];
}

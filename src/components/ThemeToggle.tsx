import { useEffect, useState } from 'react';
import { Moon, Sun } from 'lucide-react';
import { Switch } from '@/components/ui/switch';

export function ThemeToggle() {
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  useEffect(() => {
    const stored = localStorage.getItem('theme') as 'light' | 'dark' | null;
    if (stored) {
      setTheme(stored);
      document.documentElement.classList.toggle('dark', stored === 'dark');
    } else if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
      setTheme('dark');
      document.documentElement.classList.add('dark');
    }
  }, []);

  const toggle = (checked: boolean) => {
    const next = checked ? 'dark' : 'light';
    setTheme(next);
    localStorage.setItem('theme', next);
    document.documentElement.classList.toggle('dark', next === 'dark');
  };

  return (
    <div className="flex items-center gap-2">
      <Sun className="w-4 h-4 shrink-0" />
      <Switch checked={theme === 'dark'} onCheckedChange={toggle} />
      <Moon className="w-4 h-4 shrink-0" />
    </div>
  );
}

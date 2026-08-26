import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
import { Switch } from "@/shared/ui/switch";
import { loadStoredTheme, storeTheme, type Theme } from "@/shared/lib/theme";

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>("light");

  useEffect(() => {
    const stored = loadStoredTheme();
    if (stored) {
      setTheme(stored);
      document.documentElement.classList.toggle("dark", stored === "dark");
    } else if (window.matchMedia("(prefers-color-scheme: dark)").matches) {
      setTheme("dark");
      document.documentElement.classList.add("dark");
    }
  }, []);

  const toggle = (checked: boolean) => {
    const next: Theme = checked ? "dark" : "light";
    setTheme(next);
    storeTheme(next);
    document.documentElement.classList.toggle("dark", next === "dark");
  };

  return (
    <div className="flex items-center gap-2">
      <Sun className="w-4 h-4 shrink-0" />
      <Switch checked={theme === "dark"} onCheckedChange={toggle} />
      <Moon className="w-4 h-4 shrink-0" />
    </div>
  );
}

// Хранилище темы вне UI-слоя: компоненты не читают localStorage напрямую.

export type Theme = "light" | "dark";

export function loadStoredTheme(): Theme | null {
  const stored = localStorage.getItem("theme");
  // Валидация: произвольная строка из storage темой не является.
  if (stored === "dark" || stored === "light") return stored;
  return null;
}

export function storeTheme(theme: Theme): void {
  localStorage.setItem("theme", theme);
}

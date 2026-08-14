// МРОТ (руб./мес.) по годам. Источник: федеральные законы о федеральном
// бюджете на соответствующий год.
const MROT_BY_YEAR: Record<number, number> = {
  2024: 19_242,
  2025: 22_440,
  2026: 27_093,
};

// Единая предельная величина базы для исчисления страховых взносов (руб./год).
// Источник: постановления Правительства РФ (2024 – от 25.10.2023 № 1814,
// 2025 – от 31.10.2024 № 1457, 2026 – от 31.10.2025 № 1705).
// Для больничного года N нужны потолки (N-1) и (N-2).
const CONTRIBUTION_BASE_BY_YEAR: Record<number, number> = {
  2022: 1_560_000,
  2023: 1_917_000,
  2024: 2_225_000,
  2025: 2_759_000,
};

export type SickLeaveYearLimits = {
  minAvgDailyEarningsKop: number;
  maxAvgDailyEarningsKop: number;
};

// Лимиты СДЗ для года больничного (ст. 15 ФЗ-255):
// MIN = МРОТ × 24 / 730, MAX = (потолок (N-1) + потолок (N-2)) / 730.
// Для годов вне таблицы используются лимиты ближайшего доступного года –
// новые значения добавляются в таблицы выше, когда их установят.
export function getSickLeaveLimits(year: number): SickLeaveYearLimits {
  const y = Math.min(Math.max(year, 2024), 2026);
  const mrotKop = MROT_BY_YEAR[y]! * 100;
  const baseKop =
    (CONTRIBUTION_BASE_BY_YEAR[y - 1]! + CONTRIBUTION_BASE_BY_YEAR[y - 2]!) * 100;
  return {
    minAvgDailyEarningsKop: Math.round((mrotKop * 24) / 730),
    maxAvgDailyEarningsKop: Math.round(baseKop / 730),
  };
}

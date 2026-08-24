import {
  clampYear,
  getContributionBase,
  getYearSettings,
} from "@/shared/lib/yearSettings";

export type SickLeaveYearLimits = {
  minAvgDailyEarningsKop: number;
  maxAvgDailyEarningsKop: number;
};

// Лимиты СДЗ для года больничного (ст. 15 ФЗ-255):
// MIN = МРОТ × 24 / 730, MAX = (база (N-1) + база (N-2)) / 730.
// Данные – из единой таблицы настроек (yearSettings).
export function getSickLeaveLimits(year: number): SickLeaveYearLimits {
  const y = clampYear(year);
  const { mrotKop } = getYearSettings(y);
  const baseKop = getContributionBase(y - 1) + getContributionBase(y - 2);
  return {
    minAvgDailyEarningsKop: Math.round((mrotKop * 24) / 730),
    maxAvgDailyEarningsKop: Math.round(baseKop / 730),
  };
}

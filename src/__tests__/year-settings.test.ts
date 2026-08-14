import { describe, it, expect } from "vitest";
import {
  MIN_DISPLAY_YEAR,
  MAX_DISPLAY_YEAR,
  RC_BASE_BRACKETS,
  clampYear,
  getContributionBase,
  getWorkInjuryMonthlyCapKop,
  getYearSettings,
} from "@/shared/lib/yearSettings";
import { localDate as ld } from "@/shared/types/local-date";

const PROGRESSIVE_2025 = [
  [240_000_000, 13],
  [500_000_000, 15],
  [2_000_000_000, 18],
  [5_000_000_000, 20],
  [Infinity, 22],
] as [number, number][];

describe("yearSettings: реестр", () => {
  it("2024: значения", () => {
    const s = getYearSettings(2024);
    expect(s.mrotKop).toBe(1_924_200);
    expect(s.workInjuryMonthlyBenefitKop).toBe(10_878_404);
    expect(s.ndflBrackets).toEqual([
      [500_000_000, 13],
      [Infinity, 15],
    ]);
    expect(s.rcSeparateBase).toEqual({ salary: false, averageEarnings: false });
  });

  it("2025: значения", () => {
    const s = getYearSettings(2025);
    expect(s.mrotKop).toBe(2_244_000);
    expect(s.workInjuryMonthlyBenefitKop).toBe(11_911_852);
    expect(s.ndflBrackets).toEqual(PROGRESSIVE_2025);
    expect(s.rcSeparateBase).toEqual({ salary: true, averageEarnings: false });
  });

  it("2026: значения", () => {
    const s = getYearSettings(2026);
    expect(s.mrotKop).toBe(2_709_300);
    expect(s.workInjuryMonthlyBenefitKop).toBe(12_578_916);
    expect(s.ndflBrackets).toEqual(PROGRESSIVE_2025);
    expect(s.rcSeparateBase).toEqual({ salary: true, averageEarnings: true });
  });

  it("годы вне таблицы: clamp", () => {
    expect(clampYear(2023)).toBe(2024);
    expect(clampYear(2028)).toBe(2027);
    expect(getYearSettings(2023)).toEqual(getYearSettings(2024));
    expect(getYearSettings(2028)).toEqual(getYearSettings(2027));
  });

  it("getContributionBase: значения и fallback", () => {
    expect(getContributionBase(2022)).toBe(156_000_000);
    expect(getContributionBase(2023)).toBe(191_700_000);
    expect(getContributionBase(2024)).toBe(222_500_000);
    expect(getContributionBase(2025)).toBe(275_900_000);
    expect(getContributionBase(2026)).toBe(297_900_000);
    expect(getContributionBase(2021)).toBe(156_000_000);
    expect(getContributionBase(2027)).toBe(297_900_000);
  });

  it("RC_BASE_BRACKETS: 13% до 5 млн, 15% свыше", () => {
    expect(RC_BASE_BRACKETS).toEqual([
      [500_000_000, 13],
      [Infinity, 15],
    ]);
  });

  it("диапазон поддерживаемых лет = min/max ключей таблицы", () => {
    expect(MIN_DISPLAY_YEAR).toBe(2024);
    expect(MAX_DISPLAY_YEAR).toBe(2027);
  });
});

describe("yearSettings: per-field fallback", () => {
  it("2027: не установленные настройки – из 2026", () => {
    const s = getYearSettings(2027);
    expect(s.mrotKop).toBe(2_709_300);
    expect(s.workInjuryMonthlyBenefitKop).toBe(12_578_916);
  });

  it("2027: установленные настройки – из строки 2027", () => {
    const s = getYearSettings(2027);
    expect(s.ndflBrackets).toEqual(PROGRESSIVE_2025);
    expect(s.rcSeparateBase).toEqual({ salary: true, averageEarnings: true });
  });

  it("установленное поле не затеняется предыдущим годом", () => {
    // 2025: averageEarnings = false, 2026: true – берётся строка 2026.
    expect(getYearSettings(2026).rcSeparateBase).toEqual({
      salary: true,
      averageEarnings: true,
    });
    // 2025: averageEarnings = false, 2024: false – берётся строка 2025.
    expect(getYearSettings(2025).rcSeparateBase).toEqual({
      salary: true,
      averageEarnings: false,
    });
  });
});

describe("yearSettings: getWorkInjuryMonthlyCapKop", () => {
  it("февраль+ – по году", () => {
    expect(getWorkInjuryMonthlyCapKop(ld(2024, 2, 1))).toBe(43_513_616);
    expect(getWorkInjuryMonthlyCapKop(ld(2024, 12, 31))).toBe(43_513_616);
    expect(getWorkInjuryMonthlyCapKop(ld(2025, 3, 15))).toBe(47_647_408);
    expect(getWorkInjuryMonthlyCapKop(ld(2026, 2, 1))).toBe(50_315_664);
  });

  it("январь – по (N-1)", () => {
    expect(getWorkInjuryMonthlyCapKop(ld(2026, 1, 15))).toBe(47_647_408);
    expect(getWorkInjuryMonthlyCapKop(ld(2025, 1, 15))).toBe(43_513_616);
    // январь 2024 → 2023 → clamp на 2024
    expect(getWorkInjuryMonthlyCapKop(ld(2024, 1, 15))).toBe(43_513_616);
  });
});

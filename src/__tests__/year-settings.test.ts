import { describe, it, expect } from "vitest";
import {
  MIN_DISPLAY_YEAR,
  MAX_DISPLAY_YEAR,
  RC_BASE_BRACKETS,
  clampYear,
  getContributionBase,
  getWorkInjuryMonthlyCapKop,
  getYearHolidays,
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

const TWO_BRACKET_13_15 = [
  [500_000_000, 13],
  [Infinity, 15],
] as [number, number][];

describe("yearSettings: реестр", () => {
  it("2020: значения (полная строка, плоская шкала 13%)", () => {
    const s = getYearSettings(2020);
    expect(s.mrotKop).toBe(1_213_000);
    expect(s.workInjuryMonthlyBenefitKop).toBe(7_960_238);
    expect(s.ndflBrackets).toEqual([[Infinity, 13]]);
    expect(s.rcSeparateBase).toEqual({ salary: false, averageEarnings: false });
  });

  it("2021–2023: значения", () => {
    const s2021 = getYearSettings(2021);
    expect(s2021.mrotKop).toBe(1_279_200);
    expect(s2021.workInjuryMonthlyBenefitKop).toBe(8_350_290);
    expect(s2021.ndflBrackets).toEqual(TWO_BRACKET_13_15);
    expect(s2021.rcSeparateBase).toEqual({ salary: false, averageEarnings: false });

    const s2022 = getYearSettings(2022);
    expect(s2022.mrotKop).toBe(1_389_000);
    expect(s2022.workInjuryMonthlyBenefitKop).toBe(9_051_714);
    expect(s2022.ndflBrackets).toEqual(TWO_BRACKET_13_15);

    const s2023 = getYearSettings(2023);
    expect(s2023.mrotKop).toBe(1_624_200);
    expect(s2023.workInjuryMonthlyBenefitKop).toBe(10_128_868);
    expect(s2023.ndflBrackets).toEqual(TWO_BRACKET_13_15);
    expect(s2023.rcSeparateBase).toEqual({ salary: false, averageEarnings: false });
  });

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
    expect(clampYear(2019)).toBe(2020);
    expect(clampYear(2028)).toBe(2027);
    expect(getYearSettings(2019)).toEqual(getYearSettings(2020));
    expect(getYearSettings(2028)).toEqual(getYearSettings(2027));
  });

  it("getContributionBase: значения 2018–2026", () => {
    expect(getContributionBase(2018)).toBe(102_000_000);
    expect(getContributionBase(2019)).toBe(115_000_000);
    expect(getContributionBase(2020)).toBe(129_240_000);
    expect(getContributionBase(2021)).toBe(156_500_000);
    expect(getContributionBase(2022)).toBe(156_000_000);
    expect(getContributionBase(2023)).toBe(191_700_000);
    expect(getContributionBase(2024)).toBe(222_500_000);
    expect(getContributionBase(2025)).toBe(275_900_000);
    expect(getContributionBase(2026)).toBe(297_900_000);
  });

  it("getContributionBase: fallback – ближайший предыдущий год", () => {
    expect(getContributionBase(2017)).toBe(102_000_000);
    expect(getContributionBase(2027)).toBe(297_900_000);
  });

  it("RC_BASE_BRACKETS: 13% до 5 млн, 15% свыше", () => {
    expect(RC_BASE_BRACKETS).toEqual([
      [500_000_000, 13],
      [Infinity, 15],
    ]);
  });

  it("диапазон поддерживаемых лет = min/max ключей таблицы", () => {
    expect(MIN_DISPLAY_YEAR).toBe(2020);
    expect(MAX_DISPLAY_YEAR).toBe(2027);
  });
});

describe("yearSettings: праздничные дни года", () => {
  it("состав: 1–6 января и 8 января, 23.02, 08.03, 01.05, 09.05, 12.06, 04.11", () => {
    expect(getYearHolidays(2024)).toEqual([
      [1, 1],
      [1, 2],
      [1, 3],
      [1, 4],
      [1, 5],
      [1, 6],
      [1, 8],
      [2, 23],
      [3, 8],
      [5, 1],
      [5, 9],
      [6, 12],
      [11, 4],
    ]);
  });

  it("7 января не входит в список", () => {
    const holidays = getYearHolidays(2024);
    expect(holidays.some(([m, d]) => m === 1 && d === 7)).toBe(false);
  });

  it("одинаковый список для всех поддерживаемых годов", () => {
    for (let y = 2020; y <= 2027; y++) {
      expect(getYearHolidays(y)).toEqual(getYearHolidays(2024));
    }
  });

  it("годы вне таблицы – через clamp", () => {
    expect(getYearHolidays(2019)).toEqual(getYearHolidays(2020));
    expect(getYearHolidays(2028)).toEqual(getYearHolidays(2027));
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
    expect(getWorkInjuryMonthlyCapKop(ld(2024, 1, 15))).toBe(40_515_472);
    expect(getWorkInjuryMonthlyCapKop(ld(2023, 1, 15))).toBe(36_206_856);
    expect(getWorkInjuryMonthlyCapKop(ld(2022, 1, 15))).toBe(33_401_160);
  });

  it("январь 2020 – по строке 2020 (строки 2019 нет)", () => {
    // 4 × 7 960 238 коп (строка 2020)
    expect(getWorkInjuryMonthlyCapKop(ld(2020, 1, 15))).toBe(31_840_952);
  });
});

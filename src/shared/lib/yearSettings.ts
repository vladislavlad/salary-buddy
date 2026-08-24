import type { LocalDate } from "@/shared/types/local-date";

// Единая таблица годозависимых настроек расчёта – единственный источник
// правды для всех расчётных модулей. Все суммы в копейках.

/** Прогрессивная шкала НДФЛ: [порогKop, ставка%]. */
export type NdflBrackets = [thresholdKop: number, ratePercent: number][];

/** Категории выплат, к которым применяется отдельная база НДФЛ для части РК. */
export interface RcSeparateBase {
  /** Оклад/аванс/премия – с 2025 (п. 1.2 ст. 224, п. 6.2 ст. 210 НК РФ). */
  salary: boolean;
  /** Выплаты из среднего заработка (отпускные, больничные, доплата) – с 2026 (абз. 2 п. 6.2 ст. 210 НК РФ). */
  averageEarnings: boolean;
}

export interface YearSettings {
  /** МРОТ, коп/мес. */
  mrotKop: number;
  /** Макс. ежемесячная страховая выплата, коп/мес. */
  workInjuryMonthlyBenefitKop: number;
  /** Шкала НДФЛ за год. */
  ndflBrackets: NdflBrackets;
  /** Отдельная база РК по категориям выплат. */
  rcSeparateBase: RcSeparateBase;
}

// Шкала НДФЛ 2021–2024 (446-ФЗ, действует с 01.01.2021): 13% до 5 млн ₽, 15% свыше.
const NDFL_2021_2023: NdflBrackets = [
  [500_000_000, 13], // 5 000 000 ₽
  [Infinity, 15],
];

// Шкала НДФЛ 2020: плоская 13%.
const NDFL_SINGLE_2020: NdflBrackets = [[Infinity, 13]];

// Шкала НДФЛ 2025–2027 (ФЗ-176): 13/15/18/20/22.
const NDFL_PROGRESSIVE_2025: NdflBrackets = [
  [240_000_000, 13], // 2 400 000 ₽
  [500_000_000, 15], // 5 000 000 ₽
  [2_000_000_000, 18], // 20 000 000 ₽
  [5_000_000_000, 20], // 50 000 000 ₽
  [Infinity, 22],
];

// Строка года может быть частичной: настройка, ещё не установленная
// нормативным актом, опускается и разрешается из ближайшего предыдущего года.
const YEAR_SETTINGS: Record<number, Partial<YearSettings>> = {
  // Первая строка – полная (обход resolveField начинается с неё).
  2020: {
    mrotKop: 1_213_000,
    workInjuryMonthlyBenefitKop: 7_960_238, // постановление Правительства РФ от 29.01.2020 № 61
    ndflBrackets: NDFL_SINGLE_2020,
    rcSeparateBase: { salary: false, averageEarnings: false },
  },
  2021: {
    mrotKop: 1_279_200,
    workInjuryMonthlyBenefitKop: 8_350_290, // постановление Правительства РФ от 28.01.2021 № 73
    ndflBrackets: NDFL_2021_2023,
    rcSeparateBase: { salary: false, averageEarnings: false },
  },
  2022: {
    // МРОТ на 01.01.2022; внутригодовое повышение (с 01.06.2022 – 15 279 ₽) не учитывается.
    mrotKop: 1_389_000,
    workInjuryMonthlyBenefitKop: 9_051_714, // постановление Правительства РФ от 27.01.2022 № 57
    ndflBrackets: NDFL_2021_2023,
    rcSeparateBase: { salary: false, averageEarnings: false },
  },
  2023: {
    mrotKop: 1_624_200,
    workInjuryMonthlyBenefitKop: 10_128_868, // постановление Правительства РФ от 30.01.2023 № 119
    ndflBrackets: NDFL_2021_2023,
    rcSeparateBase: { salary: false, averageEarnings: false },
  },
  2024: {
    mrotKop: 1_924_200,
    workInjuryMonthlyBenefitKop: 10_878_404,
    ndflBrackets: NDFL_2021_2023,
    rcSeparateBase: { salary: false, averageEarnings: false },
  },
  2025: {
    mrotKop: 2_244_000,
    workInjuryMonthlyBenefitKop: 11_911_852,
    ndflBrackets: NDFL_PROGRESSIVE_2025,
    rcSeparateBase: { salary: true, averageEarnings: false },
  },
  2026: {
    mrotKop: 2_709_300,
    workInjuryMonthlyBenefitKop: 12_578_916,
    ndflBrackets: NDFL_PROGRESSIVE_2025,
    rcSeparateBase: { salary: true, averageEarnings: true },
  },
  // МРОТ, предельная база взносов и макс. выплата по травме на 2027 ещё не
  // установлены (на 08.2026) – разрешаются из 2026.
  2027: {
    ndflBrackets: NDFL_PROGRESSIVE_2025,
    rcSeparateBase: { salary: true, averageEarnings: true },
  },
};

// Единая предельная величина базы для исчисления страховых взносов, коп/год.
// Для лимитов СДЗ года N нужны базы (N-1) и (N-2), поэтому серия начинается
// раньше, чем таблица настроек.
const CONTRIBUTION_BASE_BY_YEAR: Partial<Record<number, number>> = {
  2018: 102_000_000,
  2019: 115_000_000,
  2020: 129_240_000,
  2021: 156_500_000,
  2022: 156_000_000,
  2023: 191_700_000,
  2024: 222_500_000,
  2025: 275_900_000,
  2026: 297_900_000,
};

// Отдельная база для части РК (п. 6.2 ст. 210 НК РФ): 13% до 5 млн ₽ в год,
// 15% на сумму превышения – одна для всех лет.
export const RC_BASE_BRACKETS: NdflBrackets = [
  [500_000_000, 13],
  [Infinity, 15],
];

/** Официальные праздники РФ (ст. 112 ТК РФ): [месяц, день]. */
const STATUTORY_HOLIDAYS: [number, number][] = [
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
];

// Праздничные дни по годам (ст. 112 ТК РФ, один список на все годы) –
// накладываются поверх календаря провайдера кодом 8.
const HOLIDAYS_BY_YEAR: Record<number, [number, number][]> = {
  2020: STATUTORY_HOLIDAYS,
  2021: STATUTORY_HOLIDAYS,
  2022: STATUTORY_HOLIDAYS,
  2023: STATUTORY_HOLIDAYS,
  2024: STATUTORY_HOLIDAYS,
  2025: STATUTORY_HOLIDAYS,
  2026: STATUTORY_HOLIDAYS,
  2027: STATUTORY_HOLIDAYS,
};

/** Список праздничных дней года, [месяц, день]; годы вне таблицы – через clamp. */
export function getYearHolidays(year: number): [number, number][] {
  // Fallback на STATUTORY_HOLIDAYS: добавление нового года в YEAR_SETTINGS
  // без строки в HOLIDAYS_BY_YEAR не должно ломать загрузку календаря.
  return HOLIDAYS_BY_YEAR[clampYear(year)] ?? STATUTORY_HOLIDAYS;
}

function sortedKeys(table: Record<number, unknown>): number[] {
  return Object.keys(table)
    .map(Number)
    .sort((a, b) => a - b);
}

const YEAR_KEYS = sortedKeys(YEAR_SETTINGS);
const MIN_SETTINGS_YEAR = YEAR_KEYS[0]!;
const MAX_SETTINGS_YEAR = YEAR_KEYS[YEAR_KEYS.length - 1]!;

const BASE_KEYS = sortedKeys(CONTRIBUTION_BASE_BY_YEAR);
const MIN_BASE_YEAR = BASE_KEYS[0]!;
const MAX_BASE_YEAR = BASE_KEYS[BASE_KEYS.length - 1]!;

/** Диапазон поддерживаемых лет приложения – вычисляется из таблицы. */
export const MIN_DISPLAY_YEAR = MIN_SETTINGS_YEAR;
export const MAX_DISPLAY_YEAR = MAX_SETTINGS_YEAR;

export function clampYear(year: number): number {
  return Math.min(Math.max(year, MIN_SETTINGS_YEAR), MAX_SETTINGS_YEAR);
}

// Разрешение поля: ближайшее значение из года ≤ clamp(year), где поле задано.
// Первая строка полная, поэтому обход всегда сходится.
function resolveField<T>(
  table: Record<number, Partial<YearSettings>>,
  minYear: number,
  maxYear: number,
  year: number,
  pick: (settings: Partial<YearSettings>) => T | undefined,
): T {
  const clamped = Math.min(Math.max(year, minYear), maxYear);
  for (let y = clamped; y >= minYear; y--) {
    const value = pick(table[y] ?? {});
    if (value !== undefined) return value;
  }
  throw new Error(`Настройки года ${year} не найдены`);
}

/** Полный объект настроек для года (не заданные поля – из ближайшего предыдущего года). */
export function getYearSettings(year: number): YearSettings {
  return {
    mrotKop: resolveField(
      YEAR_SETTINGS,
      MIN_SETTINGS_YEAR,
      MAX_SETTINGS_YEAR,
      year,
      (s) => s.mrotKop,
    ),
    workInjuryMonthlyBenefitKop: resolveField(
      YEAR_SETTINGS,
      MIN_SETTINGS_YEAR,
      MAX_SETTINGS_YEAR,
      year,
      (s) => s.workInjuryMonthlyBenefitKop,
    ),
    ndflBrackets: resolveField(
      YEAR_SETTINGS,
      MIN_SETTINGS_YEAR,
      MAX_SETTINGS_YEAR,
      year,
      (s) => s.ndflBrackets,
    ),
    rcSeparateBase: resolveField(
      YEAR_SETTINGS,
      MIN_SETTINGS_YEAR,
      MAX_SETTINGS_YEAR,
      year,
      (s) => s.rcSeparateBase,
    ),
  };
}

/** Предельная база страховых взносов за год, коп/год (fallback – ближайший предыдущий год). */
export function getContributionBase(year: number): number {
  const clamped = Math.min(Math.max(year, MIN_BASE_YEAR), MAX_BASE_YEAR);
  for (let y = clamped; y >= MIN_BASE_YEAR; y--) {
    const value = CONTRIBUTION_BASE_BY_YEAR[y];
    if (value !== undefined) return value;
  }
  throw new Error(`Предельная база взносов за ${year} год не найдена`);
}

// Лимит пособия по производственной травме в месяц: 4 × макс. ежемесячной
// страховой выплаты (ст. 9 ФЗ-125). Выплата индексируется с 1 февраля,
// поэтому январь года N считается по настройкам (N-1).
export function getWorkInjuryMonthlyCapKop(date: LocalDate): number {
  const year = date.month === 1 ? date.year - 1 : date.year;
  return 4 * getYearSettings(year).workInjuryMonthlyBenefitKop;
}

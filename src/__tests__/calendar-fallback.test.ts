import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { generateFallbackCalendar } from "@/features/calendar/model/calendar-fallback";
import { isdayoffFetch } from "@/features/calendar/model/isdayoff-fetch";
import {
  computeVacationDates,
  fetchCalendar,
} from "@/features/calendar/model/calendar";
import { localDate as ld } from "@/shared/types/local-date";
import { localDateToCalendarKey } from "@/shared/lib/utils";

/** Ключ календаря для даты YYYYMMDD. */
function key(y: number, m: number, d: number): string {
  return `${y}${String(m).padStart(2, "0")}${String(d).padStart(2, "0")}`;
}

describe("generateFallbackCalendar", () => {
  describe("выходные дни", () => {
    it("суббота → код 1", () => {
      // 06.03.2027 — суббота
      const cal = generateFallbackCalendar(2027);
      expect(cal.get(key(2027, 3, 6))).toBe(1);
    });

    it("воскресенье → код 1", () => {
      // 07.03.2027 — воскресенье
      const cal = generateFallbackCalendar(2027);
      expect(cal.get(key(2027, 3, 7))).toBe(1);
    });
  });

  describe("государственные праздники", () => {
    it("1–6 января и 8 января → код 8 (Новогодние каникулы, Рождество)", () => {
      const cal = generateFallbackCalendar(2027);
      for (const d of [1, 2, 3, 4, 5, 6, 8]) {
        expect(cal.get(key(2027, 1, d))).toBe(8);
      }
    });

    it("7 января → не праздник", () => {
      // 07.01.2027 — четверг, обычный рабочий день
      const cal = generateFallbackCalendar(2027);
      expect(cal.get(key(2027, 1, 7))).toBe(0);
    });

    it("2020: 08.01.2020 (среда) → код 8, 07.01.2020 (вторник) → код 0", () => {
      const cal = generateFallbackCalendar(2020);
      expect(cal.get(key(2020, 1, 8))).toBe(8);
      expect(cal.get(key(2020, 1, 7))).toBe(0);
    });

    it("23 февраля → код 8", () => {
      const cal = generateFallbackCalendar(2027);
      expect(cal.get(key(2027, 2, 23))).toBe(8);
    });

    it("8 марта → код 8", () => {
      const cal = generateFallbackCalendar(2027);
      expect(cal.get(key(2027, 3, 8))).toBe(8);
    });

    it("1 мая → код 8", () => {
      const cal = generateFallbackCalendar(2027);
      expect(cal.get(key(2027, 5, 1))).toBe(8);
    });

    it("9 мая → код 8", () => {
      const cal = generateFallbackCalendar(2027);
      expect(cal.get(key(2027, 5, 9))).toBe(8);
    });

    it("12 июня → код 8", () => {
      const cal = generateFallbackCalendar(2027);
      expect(cal.get(key(2027, 6, 12))).toBe(8);
    });

    it("4 ноября → код 8", () => {
      const cal = generateFallbackCalendar(2027);
      expect(cal.get(key(2027, 11, 4))).toBe(8);
    });
  });

  describe("рабочие дни", () => {
    it("обычный будний день → код 0", () => {
      // 15.01.2027 — пятница, не праздник
      const cal = generateFallbackCalendar(2027);
      expect(cal.get(key(2027, 1, 15))).toBe(0);
    });

    it("будний день вне праздников → код 0", () => {
      // 10.03.2027 — среда
      const cal = generateFallbackCalendar(2027);
      expect(cal.get(key(2027, 3, 10))).toBe(0);
    });
  });

  describe("праздник в выходной день", () => {
    it("9 мая 2027 — воскресенье → код 8 (праздник приоритетнее)", () => {
      // 09.05.2027 — воскресенье, но праздник
      const cal = generateFallbackCalendar(2027);
      expect(cal.get(key(2027, 5, 9))).toBe(8);
    });

    it("1 мая 2027 — суббота → код 8 (праздник приоритетнее)", () => {
      // 01.05.2027 — суббота, но праздник
      const cal = generateFallbackCalendar(2027);
      expect(cal.get(key(2027, 5, 1))).toBe(8);
    });
  });

  describe("полнота календаря", () => {
    it("не високосный год → 365 записей", () => {
      const cal = generateFallbackCalendar(2027);
      expect(cal.size).toBe(365);
    });

    it("високосный год → 366 записей", () => {
      const cal = generateFallbackCalendar(2028);
      expect(cal.size).toBe(366);
    });
  });
});

describe("isdayoffFetch", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("возвращает данные при валидном ответе API", async () => {
    // Строка с кодами: 8 для праздников, 0 для рабочих
    const digits = "8".repeat(7) + "0".repeat(358);
    vi.spyOn(global, "fetch").mockResolvedValue({
      ok: true,
      text: () => Promise.resolve(digits),
    } as Response);

    const result = await isdayoffFetch(2026);
    expect(result).not.toBeNull();
    expect(result!.get("20260101")).toBe(8);
  });

  it("возвращает null при строке из одних нулей", async () => {
    const digits = "0".repeat(365);
    vi.spyOn(global, "fetch").mockResolvedValue({
      ok: true,
      text: () => Promise.resolve(digits),
    } as Response);

    const result = await isdayoffFetch(2028);
    expect(result).toBeNull();
  });

  it("возвращает null при пустом ответе API", async () => {
    vi.spyOn(global, "fetch").mockResolvedValue({
      ok: true,
      text: () => Promise.resolve(""),
    } as Response);

    const result = await isdayoffFetch(2028);
    expect(result).toBeNull();
  });

  it("бросает ошибку при HTTP-ошибке", async () => {
    vi.spyOn(global, "fetch").mockResolvedValue({
      ok: false,
      status: 500,
    } as Response);

    await expect(isdayoffFetch(2028)).rejects.toThrow();
  });

  it("передаёт параметр covid=1 в запрос к API", async () => {
    const fetchSpy = vi.spyOn(global, "fetch").mockResolvedValue({
      ok: true,
      text: () => Promise.resolve("0".repeat(365)),
    } as Response);

    await isdayoffFetch(2026);
    expect(String(fetchSpy.mock.calls[0]![0])).toContain("covid=1");
  });

  it("сохраняет код 4 (ковидный день) без маппинга", async () => {
    const digits = "4" + "0".repeat(364);
    vi.spyOn(global, "fetch").mockResolvedValue({
      ok: true,
      text: () => Promise.resolve(digits),
    } as Response);

    const result = await isdayoffFetch(2026);
    expect(result!.get("20260101")).toBe(4);
  });
});

describe("fetchCalendar", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("использует данные API при их наличии", async () => {
    const digits = "8".repeat(7) + "0".repeat(358);
    vi.spyOn(global, "fetch").mockResolvedValue({
      ok: true,
      text: () => Promise.resolve(digits),
    } as Response);

    const result = await fetchCalendar(2026, false);
    expect(result.data.get("20260101")).toBe(8);
    expect(result.isFallback).toBe(false);
  });

  it("переключается на fallback при отсутствии данных API", async () => {
    // isdayoff вернёт строку из нулей → null → fallback
    const digits = "0".repeat(365);
    vi.spyOn(global, "fetch").mockResolvedValue({
      ok: true,
      text: () => Promise.resolve(digits),
    } as Response);

    const result = await fetchCalendar(2028, false);
    // Fallback: 1 января — праздник (код 8)
    expect(result.data.get("20280101")).toBe(8);
    // Fallback: 8 января — праздник (код 8), 7 января — рабочий (код 0)
    expect(result.data.get("20280108")).toBe(8);
    expect(result.data.get("20280107")).toBe(0);
    // Fallback: воскресенье 05.03.2028 — выходной (код 1)
    expect(result.data.get("20280305")).toBe(1);
    // Fallback: обычный будний день — код 0
    expect(result.data.get("20280310")).toBe(0);
    expect(result.isFallback).toBe(true);
  });

  it("переключается на fallback при сетевой ошибке", async () => {
    vi.spyOn(global, "fetch").mockRejectedValue(new Error("network error"));

    const result = await fetchCalendar(2026, false);
    // Fallback: 1 января — праздник (код 8)
    expect(result.data.get("20260101")).toBe(8);
    expect(result.isFallback).toBe(true);
  });

  it("переключается на fallback при ошибке ответа API (ok: false)", async () => {
    vi.spyOn(global, "fetch").mockResolvedValue({
      ok: false,
      text: () => Promise.resolve(""),
    } as Response);

    const result = await fetchCalendar(2026, false);
    expect(result.data.get("20260101")).toBe(8);
    expect(result.isFallback).toBe(true);
  });

  it("режим «без учёта ковидных дней»: код 4 → 0 (рабочий день)", async () => {
    // Ковидный день — 15.01.2026 (не праздник, чтобы наложение кодом 8 не затирало)
    const digits = "0".repeat(14) + "4" + "0".repeat(350);
    vi.spyOn(global, "fetch").mockResolvedValue({
      ok: true,
      text: () => Promise.resolve(digits),
    } as Response);

    const result = await fetchCalendar(2026, false);
    expect(result.data.get("20260115")).toBe(0);
  });

  it("режим «с учётом ковидных дней»: код 4 сохраняется (сырые данные)", async () => {
    const digits = "0".repeat(14) + "4" + "0".repeat(350);
    vi.spyOn(global, "fetch").mockResolvedValue({
      ok: true,
      text: () => Promise.resolve(digits),
    } as Response);

    const result = await fetchCalendar(2026, true);
    expect(result.data.get("20260115")).toBe(4);
  });

  it("накладывает праздники года кодом 8 (04.11.2020 без кода 8 в API)", async () => {
    // API-календарь 2020 без праздников: все дни — код 1
    const digits = "1".repeat(366);
    vi.spyOn(global, "fetch").mockResolvedValue({
      ok: true,
      text: () => Promise.resolve(digits),
    } as Response);

    const { data } = await fetchCalendar(2020, false);
    expect(data.get("20201104")).toBe(8);
    expect(data.get("20200108")).toBe(8);
  });

  it("отпуск 2020: праздник 04.11.2020 исключается из 14 дней", async () => {
    const digits = "1".repeat(366);
    vi.spyOn(global, "fetch").mockResolvedValue({
      ok: true,
      text: () => Promise.resolve(digits),
    } as Response);

    const { data } = await fetchCalendar(2020, false);
    const dates = computeVacationDates(ld(2020, 11, 3), 14, data);
    expect(dates).toHaveLength(14);

    const dateKeys = dates.map(localDateToCalendarKey);
    expect(dateKeys).not.toContain("20201104");
    expect(dateKeys[0]).toBe("20201103");
    expect(dateKeys[1]).toBe("20201105");
    expect(dateKeys[13]).toBe("20201117");
  });
});

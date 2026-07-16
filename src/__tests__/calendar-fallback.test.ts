import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { generateFallbackCalendar } from "@/features/calendar/model/calendar-fallback";
import { isdayoffFetch } from "@/features/calendar/model/isdayoff-fetch";
import { fetchCalendar } from "@/features/calendar/model/calendar";

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
    it("1–7 января → код 8 (Новогодние каникулы)", () => {
      const cal = generateFallbackCalendar(2027);
      for (let d = 1; d <= 7; d++) {
        expect(cal.get(key(2027, 1, d))).toBe(8);
      }
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

    const result = await fetchCalendar(2026);
    expect(result.get("20260101")).toBe(8);
  });

  it("переключается на fallback при отсутствии данных API", async () => {
    // isdayoff вернёт строку из нулей → null → fallback
    const digits = "0".repeat(365);
    vi.spyOn(global, "fetch").mockResolvedValue({
      ok: true,
      text: () => Promise.resolve(digits),
    } as Response);

    const result = await fetchCalendar(2028);
    // Fallback: 1 января — праздник (код 8)
    expect(result.get("20280101")).toBe(8);
    // Fallback: воскресенье 05.03.2028 — выходной (код 1)
    expect(result.get("20280305")).toBe(1);
    // Fallback: обычный будний день — код 0
    expect(result.get("20280310")).toBe(0);
  });
});

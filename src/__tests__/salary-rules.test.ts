import { describe, expect, it } from "vitest";
import { generateSalaryId } from "@/features/salary/model/salaryRules";
import type { Salary } from "@/shared/types";
import { localDate } from "@/shared/types/local-date";

function salary(id: string, year: number, month: number, day: number): Salary {
  return { id, effectiveDate: localDate(year, month, day), amount: 100_000 };
}

describe("generateSalaryId", () => {
  it("нумерует оклады внутри года", () => {
    expect(generateSalaryId([], 2026)).toBe("sal:2026:01");
    expect(
      generateSalaryId([salary("sal:2026:01", 2026, 1, 1)], 2026),
    ).toBe("sal:2026:02");
  });

  it("сбрасывает нумерацию в новом году", () => {
    expect(
      generateSalaryId([salary("sal:2025:05", 2025, 12, 1)], 2026),
    ).toBe("sal:2026:01");
  });

  it("не переиспользует номера удалённых окладов", () => {
    const existing = [
      salary("sal:2026:01", 2026, 1, 1),
      salary("sal:2026:03", 2026, 3, 1),
    ];
    expect(generateSalaryId(existing, 2026)).toBe("sal:2026:04");
  });

  it("игнорирует идентификаторы, не соответствующие шаблону", () => {
    expect(
      generateSalaryId([salary("legacy-uuid", 2026, 1, 1)], 2026),
    ).toBe("sal:2026:01");
  });
});

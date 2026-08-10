import type {
  RegionalCoefficientChange,
  RegionalCoefficientCreateRequest,
  RegionalCoefficientUpdateRequest,
} from "@/shared/types";
import type { Result } from "@/shared/result";

function validatePercent(percent: number): Result<null> {
  if (percent < 0) {
    return { ok: false, error: "Коэффициент не может быть отрицательным" };
  }
  if (percent > 200) {
    return { ok: false, error: "Коэффициент не может превышать 200%" };
  }
  return { ok: true, value: null };
}

export function createRegionalCoefficient(
  req: RegionalCoefficientCreateRequest,
): Result<RegionalCoefficientChange> {
  const validation = validatePercent(req.percent);
  if (!validation.ok) return validation;

  return {
    ok: true,
    value: {
      id: crypto.randomUUID(),
      effectiveDate: req.effectiveDate,
      percent: req.percent,
    },
  };
}

export function updateRegionalCoefficient(
  existing: RegionalCoefficientChange,
  req: RegionalCoefficientUpdateRequest,
): Result<RegionalCoefficientChange> {
  const percent = req.percent ?? existing.percent;
  const validation = validatePercent(percent);
  if (!validation.ok) return validation;

  return {
    ok: true,
    value: {
      ...existing,
      effectiveDate: req.effectiveDate ?? existing.effectiveDate,
      percent,
    },
  };
}

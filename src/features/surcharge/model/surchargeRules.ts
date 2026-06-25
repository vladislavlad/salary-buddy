import type {
  SurchargeChange,
  SurchargeCreateRequest,
  SurchargeUpdateRequest,
} from "@/shared/types";
import type { Result } from "@/shared/result";

function validateAmount(amount: number): Result<null> {
  if (amount <= 0) {
    return { ok: false, error: "Доплата должна быть больше нуля" };
  }
  return { ok: true, value: null };
}

export function createSurcharge(
  req: SurchargeCreateRequest,
): Result<SurchargeChange> {
  const amountValidation = validateAmount(req.amount);
  if (!amountValidation.ok) return amountValidation;

  return {
    ok: true,
    value: {
      id: crypto.randomUUID(),
      effectiveDate: req.effectiveDate,
      amount: req.amount,
    },
  };
}

export function updateSurcharge(
  existing: SurchargeChange,
  req: SurchargeUpdateRequest,
): Result<SurchargeChange> {
  const amount = req.amount ?? existing.amount;
  const amountValidation = validateAmount(amount);
  if (!amountValidation.ok) return amountValidation;

  return {
    ok: true,
    value: {
      ...existing,
      effectiveDate: req.effectiveDate ?? existing.effectiveDate,
      amount,
    },
  };
}

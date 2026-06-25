import type {
  Bonus,
  BonusCreateRequest,
  BonusUpdateRequest,
} from "@/shared/types";
import type { Result } from "@/shared/result";

function generateBonusId(bonuses: Bonus[], year: number): string {
  const count = bonuses.filter((bonus) => bonus.date.year === year).length + 1;
  return `bon:${year}:${String(count).padStart(2, "0")}`;
}

function validateAmount(amount: number): Result<null> {
  if (amount <= 0) {
    return { ok: false, error: "Сумма премии должна быть больше нуля" };
  }
  return { ok: true, value: null };
}

export function createBonus(
  bonuses: Bonus[],
  req: BonusCreateRequest,
): Result<Bonus> {
  const amountValidation = validateAmount(req.amount);
  if (!amountValidation.ok) return amountValidation;

  return {
    ok: true,
    value: {
      id: generateBonusId(bonuses, req.date.year),
      date: req.date,
      amount: req.amount,
      type: req.type,
    },
  };
}

export function updateBonus(
  existing: Bonus,
  req: BonusUpdateRequest,
): Result<Bonus> {
  const amount = req.amount ?? existing.amount;
  const amountValidation = validateAmount(amount);
  if (!amountValidation.ok) return amountValidation;

  return {
    ok: true,
    value: {
      ...existing,
      date: req.date ?? existing.date,
      amount,
      type: req.type ?? existing.type,
    },
  };
}

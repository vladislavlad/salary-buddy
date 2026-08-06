import type { Payment } from "@/shared/types";

export const MONTH_NAMES = [
  "Январь",
  "Февраль",
  "Март",
  "Апрель",
  "Май",
  "Июнь",
  "Июль",
  "Август",
  "Сентябрь",
  "Октябрь",
  "Ноябрь",
  "Декабрь",
];

export const PAYMENT_PRIORITY: Record<string, number> = {
  advance: 1,
  salary: 1,
  surcharge: 1,
  vacation: 2,
  "sick-leave": 2,
  "sick-leave-sfr": 2,
  "sick-leave-topup": 2,
  bonus: 3,
};

export const PAY_VAR_SUFFIX: Record<string, string> = {
  advance: "salary",
  salary: "salary",
  surcharge: "salary",
  vacation: "vacation",
  bonus: "bonus",
  "sick-leave": "sickleave",
  "sick-leave-sfr": "sickleave",
  "sick-leave-topup": "sickleave",
};

export const PAYMENT_COLOR_VAR: Record<string, string> = {
  advance: "var(--pay-salary-bg)",
  salary: "var(--pay-salary-bg)",
  surcharge: "var(--pay-salary-bg)",
  vacation: "var(--pay-vacation-bg)",
  bonus: "var(--pay-bonus-bg)",
  "sick-leave": "var(--pay-sickleave-bg)",
  "sick-leave-sfr": "var(--pay-sickleave-bg)",
  "sick-leave-topup": "var(--pay-sickleave-bg)",
};

export function getHighestPriority(payments: Payment[]): string {
  let highest = "";
  let maxP = 0;
  for (const p of payments) {
    const pr = PAYMENT_PRIORITY[p.type] ?? 0;
    if (pr > maxP) {
      maxP = pr;
      highest = p.type;
    }
  }
  return highest;
}

export function getPaymentLabel(type: string): string {
  switch (type) {
    case "advance":
      return "Аванс";
    case "salary":
      return "Зарплата";
    case "surcharge":
      return "Доплата";
    case "vacation":
      return "Отпускные";
    case "bonus":
      return "Премия";
    case "sick-leave":
      return "Больничный (работодатель)";
    case "sick-leave-sfr":
      return "Больничный (СФР)";
    case "sick-leave-topup":
      return "Доплата к больничному";
    default:
      return type;
  }
}

export function getStripeStyle(types: string[]): React.CSSProperties | undefined {
  if (types.length < 2) return undefined;
  const unique = [...new Set(types)];
  const step = 10 / unique.length;
  const stops = unique.map((t, i) => {
    const c = PAYMENT_COLOR_VAR[t] ?? "var(--pay-salary-bg)";
    const start = (i * step).toFixed(2);
    const end = ((i + 1) * step).toFixed(2);
    return `${c} ${start}px, ${c} ${end}px`;
  });
  return {
    "--stripe-gradient": `repeating-linear-gradient(-45deg, ${stops.join(", ")})`,
  } as React.CSSProperties;
}

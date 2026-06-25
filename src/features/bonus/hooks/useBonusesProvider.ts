import { useContext } from "react";
import { BonusesContext } from "@/features/bonus/model/BonusContext";

export function useBonusesProvider() {
  const ctx = useContext(BonusesContext);
  if (!ctx)
    throw new Error("useBonusesProvider must be used within BonusesProvider");
  return ctx;
}

import { useContext } from "react";
import { SurchargeContext } from "@/features/surcharge/model/SurchargeContext";

export function useSurchargeProvider() {
  const ctx = useContext(SurchargeContext);
  if (!ctx)
    throw new Error(
      "useSurchargeProvider must be used within SurchargeProvider",
    );
  return ctx;
}

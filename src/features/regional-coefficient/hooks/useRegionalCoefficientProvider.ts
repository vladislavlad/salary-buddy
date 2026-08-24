import { useContext } from "react";
import { RegionalCoefficientContext } from "@/features/regional-coefficient/model/RegionalCoefficientContext";

export function useRegionalCoefficientProvider() {
  const ctx = useContext(RegionalCoefficientContext);
  if (!ctx)
    throw new Error(
      "useRegionalCoefficientProvider must be used within RegionalCoefficientProvider",
    );
  return ctx;
}

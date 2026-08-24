import { RegionalCoefficientContext } from "./RegionalCoefficientContext";
import { useRegionalCoefficientService } from "@/features/regional-coefficient/hooks/useRegionalCoefficient";

export function RegionalCoefficientProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const service = useRegionalCoefficientService();
  return (
    <RegionalCoefficientContext.Provider value={service}>
      {children}
    </RegionalCoefficientContext.Provider>
  );
}

import { RegionalCoefficientContext } from "./RegionalCoefficientContext";
import { useRegionalCoefficientService } from "@/features/regional-coefficient/hooks/useRegionalCoefficient";
import type { RegionalCoefficientChange } from "@/shared/types";
import type { Repository } from "@/shared/repository/Repository";

export function RegionalCoefficientProvider({
  children,
  repository,
}: {
  children: React.ReactNode;
  repository: Repository<RegionalCoefficientChange, string>;
}) {
  const service = useRegionalCoefficientService(repository);
  return (
    <RegionalCoefficientContext.Provider value={service}>
      {children}
    </RegionalCoefficientContext.Provider>
  );
}

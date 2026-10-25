import { SurchargeContext } from "./SurchargeContext";
import { useSurchargeService } from "@/features/surcharge/hooks/useSurcharge";
import type { SurchargeChange } from "@/shared/types";
import type { Repository } from "@/shared/repository/Repository";

export function SurchargeProvider({
  children,
  repository,
}: {
  children: React.ReactNode;
  repository: Repository<SurchargeChange, string>;
}) {
  const service = useSurchargeService(repository);
  return (
    <SurchargeContext.Provider value={service}>
      {children}
    </SurchargeContext.Provider>
  );
}

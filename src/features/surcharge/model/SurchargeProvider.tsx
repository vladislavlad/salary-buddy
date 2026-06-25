import { SurchargeContext } from "./SurchargeContext";
import { useSurchargeService } from "@/features/surcharge/hooks/useSurcharge";

export function SurchargeProvider({ children }: { children: React.ReactNode }) {
  const service = useSurchargeService();
  return (
    <SurchargeContext.Provider value={service}>
      {children}
    </SurchargeContext.Provider>
  );
}

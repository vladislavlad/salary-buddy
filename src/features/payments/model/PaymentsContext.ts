import { createContext } from "react";
import type { Payment } from "@/shared/types";

export interface PaymentsContextValue {
  payments: Payment[];
  setFact: (paymentId: string, factGross?: number) => Promise<void>;
}

export const PaymentsContext = createContext<PaymentsContextValue | null>(null);

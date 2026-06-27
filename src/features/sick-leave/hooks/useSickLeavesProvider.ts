import { SickLeavesContext } from "../model/SickLeavesContext";
import { useContext } from "react";

export function useSickLeavesProvider() {
  const context = useContext(SickLeavesContext);
  if (!context) {
    throw new Error("useSickLeavesProvider must be used within SickLeavesProvider");
  }
  return context;
}

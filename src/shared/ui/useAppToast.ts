import { useEffect } from "react";
import { useToast } from "@/shared/ui/use-toast";

const PENDING_TOAST_KEY = "salary-buddy-pending-toast";

type PendingToast = {
  variant?: "default" | "destructive" | "success";
  title?: string;
  description: string;
};

/**
 * Сохраняет тост в sessionStorage перед перезагрузкой страницы.
 */
export function queuePendingToast(toast: PendingToast) {
  sessionStorage.setItem(PENDING_TOAST_KEY, JSON.stringify(toast));
}

/**
 * Хук, который при маунте компонента проверяет наличие отложенного тоста и показывает его.
 */
export function useAppToast() {
  const { toast } = useToast();

  useEffect(() => {
    const raw = sessionStorage.getItem(PENDING_TOAST_KEY);
    if (!raw) return;

    try {
      const pending: PendingToast = JSON.parse(raw);
      toast(pending);
    } catch {
      // ignore corrupted data
    } finally {
      sessionStorage.removeItem(PENDING_TOAST_KEY);
    }
  }, [toast]);
}

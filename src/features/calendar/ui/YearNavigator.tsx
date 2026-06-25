import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/shared/ui/button";

/** Переключатель отображаемого года с кнопками «назад/вперёд». */
export function YearNavigator({
  year,
  canGoPrev,
  canGoNext,
  onPrev,
  onNext,
}: {
  year: number;
  canGoPrev: boolean;
  canGoNext: boolean;
  onPrev: () => void;
  onNext: () => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <Button
        variant="ghost"
        size="icon"
        disabled={!canGoPrev}
        onClick={onPrev}
        className="h-8 w-8"
      >
        <ChevronLeft className="w-4 h-4" />
      </Button>
      <span className="text-lg font-bold min-w-[48px] text-center">{year}</span>
      <Button
        variant="ghost"
        size="icon"
        disabled={!canGoNext}
        onClick={onNext}
        className="h-8 w-8"
      >
        <ChevronRight className="w-4 h-4" />
      </Button>
    </div>
  );
}

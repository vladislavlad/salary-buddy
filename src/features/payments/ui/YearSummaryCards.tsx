import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { Money } from "@/shared/ui/money";

/** Три карточки с годовыми итогами: доход до НДФЛ, НДФЛ и на руки. */
export function YearSummaryCards({
  totalGross,
  totalNdfl,
  totalNet,
}: {
  totalGross: number;
  totalNdfl: number;
  totalNet: number;
}) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 shrink-0">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm text-muted-foreground">
            Общий доход (до НДФЛ)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-xl font-bold">
            <Money amount={totalGross} />
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm text-muted-foreground">
            НДФЛ за год
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-xl font-bold text-red-500">
            <Money amount={totalNdfl} />
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm text-muted-foreground">
            На руки за год
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-xl font-bold text-green-600">
            <Money amount={totalNet} />
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

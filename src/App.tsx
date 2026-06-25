import { useState } from "react";
import {
  Plus,
  Settings2,
  Calendar as CalendarIcon,
  Umbrella,
  Download,
} from "lucide-react";

import { Card, CardContent, CardHeader } from "@/shared/ui/card";
import { Toaster } from "@/shared/ui/toaster";
import { CollapsibleSection } from "@/shared/ui/CollapsibleSection";
import { useAppToast } from "@/shared/ui/useAppToast";
import { ImportExportPanel } from "@/features/import-export/ui/ImportExportPanel";
import { SalaryManager } from "@/features/salary/ui/SalaryManager";
import { SurchargeManager } from "@/features/surcharge/ui/SurchargeManager";
import { YearCalendar } from "@/features/calendar/ui/YearCalendar";
import { YearNavigator } from "@/features/calendar/ui/YearNavigator";
import { BonusManager } from "@/features/bonus/ui/BonusManager";
import { VacationManager } from "@/features/vacation/ui/VacationManager";
import { ThemeToggle } from "@/shared/ui/ThemeToggle";
import { useSalaryProvider } from "@/features/salary/hooks/useSalaryProvider";
import { useSalaryPaymentSettingsProvider } from "@/features/salary-payment-settings/hooks/useSalaryPaymentSettingsProvider";
import { useVacationsProvider } from "@/features/vacation/hooks/useVacationsProvider";
import {
  usePaymentsForYear,
  useCalendarForYear,
} from "@/features/payments/hooks/usePaymentsHooks";
import { useYearSummary } from "@/features/payments/hooks/useYearSummary";
import { YearSummaryCards } from "@/features/payments/ui/YearSummaryCards";
import { MIN_DISPLAY_YEAR, MAX_DISPLAY_YEAR } from "@/shared/lib/utils";
import { AppProviders } from "@/app/AppProviders";

const CURRENT_YEAR = new Date().getFullYear();

function AppContent() {
  const [displayYear, setDisplayYear] = useState(CURRENT_YEAR);

  useAppToast();

  const { salaries, setSalaries } = useSalaryProvider();
  const { paymentSettings, updatePaymentSettings } =
    useSalaryPaymentSettingsProvider();
  const { vacations } = useVacationsProvider();

  const calendarData = useCalendarForYear(displayYear);
  const payments = usePaymentsForYear(displayYear);

  const { vacationDays, totalGross, totalNdfl, totalNet } = useYearSummary(
    payments,
    vacations,
    displayYear,
  );

  const canGoPrev = displayYear > MIN_DISPLAY_YEAR;
  const canGoNext = displayYear < MAX_DISPLAY_YEAR;

  return (
    <div className="flex flex-col min-h-screen bg-background lg:h-screen lg:overflow-hidden">
      <header className="border-b bg-card-secondary shrink-0">
        <div className="px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Зарплатный помощник</h1>
            <p className="text-muted-foreground text-sm">
              Расчёт зарплаты с учётом НДФЛ и календаря РФ
            </p>
          </div>
          <ThemeToggle />
        </div>
      </header>

      <main className="flex flex-col lg:flex-row gap-6 px-4 py-6 lg:px-6 lg:py-8 lg:gap-3 flex-1 overflow-hidden">
        {/* Левая колонка — настройки */}
        <aside className="w-full lg:w-[380px] lg:shrink-0 space-y-6 lg:h-full lg:min-h-0 lg:overflow-y-auto sidebar-scroll pr-2 lg:pr-4 lg:pb-4 lg:pl-2 lg:-ml-2">
          <CollapsibleSection title="Настройки зарплаты" icon={Settings2}>
            <SalaryManager
              salaries={salaries}
              paymentSettings={paymentSettings}
              onSalariesChange={setSalaries}
              onPaymentSettingsChange={updatePaymentSettings}
            />
          </CollapsibleSection>

          <CollapsibleSection title="Доплаты" icon={Settings2}>
            <SurchargeManager />
          </CollapsibleSection>

          <CollapsibleSection title="Премии" icon={Plus}>
            <BonusManager />
          </CollapsibleSection>

          <CollapsibleSection title="Отпуска" icon={Umbrella}>
            <VacationManager />
          </CollapsibleSection>

          <CollapsibleSection title="Выгрузка данных" icon={Download}>
            <ImportExportPanel />
          </CollapsibleSection>
        </aside>

        {/* Правая колонка — календарь и итоги */}
        <div className="flex-1 min-w-0 flex flex-col gap-6">
          {/* Календарь */}
          <Card className="flex flex-col flex-1 min-h-0">
            <CardHeader className="pb-4 px-6 pt-6 shrink-0">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CalendarIcon className="w-5 h-5" />
                  <h2 className="font-semibold leading-none tracking-tight">
                    Календарь выплат
                  </h2>
                </div>
                <YearNavigator
                  year={displayYear}
                  canGoPrev={canGoPrev}
                  canGoNext={canGoNext}
                  onPrev={() => setDisplayYear((y) => y - 1)}
                  onNext={() => setDisplayYear((y) => y + 1)}
                />
              </div>
            </CardHeader>

            <CardContent className="px-6 pb-4 pt-0 flex flex-col flex-1 min-h-0">
              {/* Скроллируемая область календаря */}
              <div className="flex-1 overflow-y-auto calendar-scroll">
                <div className="pr-3 min-h-full">
                  {!calendarData ? (
                    <p className="text-muted-foreground text-center py-8">
                      Загрузка календаря...
                    </p>
                  ) : (
                    <YearCalendar
                      year={displayYear}
                      payments={payments}
                      vacationDays={vacationDays}
                      calendarData={calendarData}
                    />
                  )}
                </div>
              </div>

              {/* Легенда — прижата к низу */}
              <div className="flex items-center gap-5 mt-3 pt-2 border-t shrink-0 text-xs flex-wrap">
                <div className="flex items-center gap-2">
                  <span
                    className="w-3 h-3 rounded-full border"
                    style={{
                      backgroundColor: "var(--pay-salary-bg)",
                      borderColor: "var(--pay-salary-border)",
                    }}
                  />
                  <span>Выплата ЗП</span>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className="w-3 h-3 rounded-full border"
                    style={{
                      backgroundColor: "var(--pay-vacation-bg)",
                      borderColor: "var(--pay-vacation-border)",
                    }}
                  />
                  <span>Отпускные</span>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className="w-3 h-3 rounded-full border"
                    style={{
                      backgroundColor: "var(--pay-bonus-bg)",
                      borderColor: "var(--pay-bonus-border)",
                    }}
                  />
                  <span>Премия</span>
                </div>

                <div className="flex items-center gap-2">
                  <span
                    className="w-3 h-3 rounded-md border"
                    style={{
                      backgroundColor: "var(--vac-day-bg)",
                      borderColor: "var(--vac-day-border)",
                    }}
                  />
                  <span>Отпуск</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Итоги */}
          <YearSummaryCards
            totalGross={totalGross}
            totalNdfl={totalNdfl}
            totalNet={totalNet}
          />
        </div>
      </main>
      <Toaster />
    </div>
  );
}

export function App() {
  return (
    <AppProviders>
      <AppContent />
    </AppProviders>
  );
}

export default App;

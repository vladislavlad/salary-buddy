# Tech Debt

## Обратная зависимость features → app/repositories (7 мест)

Все фичи импортируют репозитории напрямую из `app/`, вместо инжекта через context:

- `features/bonus/hooks/useBonuses.ts` — bonusRepository
- `features/salary/hooks/useSalaryService.ts` — salaryRepository
- `features/payments/model/PaymentsProvider.tsx` — paymentsRepository
- `features/vacation/model/VacationsProvider.tsx` — vacationRepository
- `features/sick-leave/model/SickLeavesProvider.tsx` — sickLeaveRepository, sickLeaveSettingsRepository
- `features/surcharge/hooks/useSurcharge.ts` — surchargeRepository
- `features/salary-payment-settings/hooks/useSalaryPaymentSettingsService.ts` — salaryPaymentSettingsRepository

**Последствия:** фичи не изолированы от app-слоя; замена storage потребует правки 8 мест вместо одного.

**Решение:** передать репозитории через context (как в import-export) или как props провайдеров.

## JS чанк 718 KB

Один чанк без code-splitting. Не критично для SPA, но можно рассмотреть `manualChunks` по фичам.

# Tech Debt

## 2. useFactEditor: priorYtdGrossKop неверен при повторном установлении факта

✅ Выполнено (25.10.2026): `priorYtdGrossKop = yearToDateGross − (net + ndfl)`
(эффективный gross), выплаты без НДФЛ (доплата, СФР) вынесены в отдельную
ветку `noNdfl` без обратного расчёта. Тесты: `__tests__/fact-editor.test.tsx`.
Приближение про отдельную базу РК в `grossFromNet` осталось (см. COEF_TODO п.1).

`src/features/calendar/hooks/useFactEditor.ts:50`:
`priorYtdGrossKop = payment.yearToDateGross - payment.gross`.
Когда на платеже есть `fact`, `yearToDateGross` уже посчитан от fact
(effectiveGrossKop в `buildPaymentsWithNdfl`), а вычитается плановый `gross`.
При повторном редактировании такого платежа накопленный доход завышается на
`fact - gross`, и `grossFromNet` даёт неверный gross.
Плюс приближение: `grossFromNet` считает по одной базе, а у РК-выплат база РК
отдельная (п. 6.2 ст. 210 НК РФ).

**Решение:** хранить/вычислять "накопленный доход ДО этой выплаты" явно
(например, в `Payment` или брать с предыдущего платежа в списке), а не
вычитать из YTD-после.

## 5. Мертвый код в buildSalaryEvents (ядро, менять только по запросу)

`src/features/payments/model/calculation/index.ts`: флаги `advanceInYear` и
`salaryInYear` всегда `true` — даты строятся в том же году, а
`advancePaymentDay`/`salaryPaymentDay` ограничены 1–28 (zod), поэтому clamp на
`daysInMonth` тоже не нужен. Мертвы: ветки `!advanceInYear`,
`!salaryInYear`, `continue`, слияние `salaryGrossKop += advanceGrossKop`,
а также `LocalDate | null` в `MonthPaymentDates` и null-обработка в
`resolveEmployerPayDate` (sick-leave.ts). Комментарий «advancePaymentDay может
быть больше daysInMonth» устарел.

## 6. stabilizeVacations: итеративная «стабилизация» избыточна (ядро)

Отпускные НЕ учитываются в базе среднего заработка (подтверждено):
- `tempPayments` строится с `filter((e) => e.type !== "vacation")` —
  отпускные события в доход не попадают;
- `relevantVacations` берётся из статичного списка `vacations`, а не из событий;
- законно отпускные из среднего заработка исключаются (ст. 139 ТК РФ).

Следовательно результат первой итерации финален, а цикл (лимит 5) и сравнение
результатов — нет-оп: при наличии отпусков всегда ровно 2 прохода.
**Решение:** заменить цикл на один проход (требует отдельного запроса —
расчётное ядро). Пока что константа `MAX_STABILIZATION_ITERATIONS` с комментарием.

## 8. Timezone-баг в localToDate

`src/shared/types/local-date.ts:21`: `new Date("YYYY-MM-DD")` — это UTC-полночь;
date-fns форматирует в локальном времени, в поясах с отрицательным смещением
дата уходит на день назад. Для РФ (UTC+3) не проявляется.
**Решение:** форматировать из PlainDate напрямую (без date-fns) или строить
`Date` из year/month/day в локальном времени.

## 10. Обратная зависимость features → app/repositories

✅ Выполнено (25.10.2026): все провайдеры фич принимают репозитории пропсами,
единственная точка сборки – `AppProviders`; импортов `@/app/repositories`
в фичах нет. `CalendarProvider` читает настройки через
`useCalendarSettingsProvider` (контекст), фабрики `createService` заменены
prop'ом `repository`.

Все фичи импортируют репозитории напрямую из `app/` (11 мест), а import-export
получает их через контекст — два разных паттерна DI.

**Места:** useBonuses, useSalaryService, useSurcharge, useRegionalCoefficient,
useSalaryPaymentSettingsService, useCalendarSettings, PaymentsProvider,
VacationsProvider, SickLeavesProvider, CalendarSettingsProvider.

**Решение (рекомендация):** единая точка сборки — `AppProviders` передаёт
репозитории в провайдеры фич как props (прецедент уже есть:
`SickLeavesProvider` принимает `createService`), хуки берут service из
контекста. Фичи перестают зависеть от app-слоя; замена storage — одна правка.

## 12. Два паттерна загрузки настроек

✅ Выполнено (25.10.2026): TanStack Query принят как единый механизм чтения
локальных асинхронных источников и внешних календарей. Решение и причины
зафиксированы в `AGENTS.md`, `README.md` и `openspec/config.yaml`.
Все локальные запросы используют общий префикс `LOCAL_QUERY_KEY` и
`LOCAL_QUERY_OPTIONS` (`networkMode: "always"`, `retry: false`); после импорта
обновляются только локальные запросы. Настройки больничных загружаются этим
же способом, `loading` покрывает список и настройки.

Частичные обновления настроек больничных и дат выплат сериализуются по
репозиторию, включая разные экземпляры сервисов; невалидные изменения
отклоняются до записи, очередь продолжает работу после ошибок.
Тесты: `__tests__/settings-updates.test.ts`, `__tests__/local-queries.test.tsx`,
`__tests__/sick-leave-service.test.ts`.

## 13. HOLIDAYS_BY_YEAR: замечание с review отозвано

В review я назвал таблицу «чистой дубликацией» — неверно. Таблица нужна для
годовых переносов/перестановок праздников (каждый год правительство переносит
дни); сейчас все строки указывают на базовый список ст. 112 ТК РФ, пока
годовые override не заполнены. Решения не требуется.

## 14. SickLeaveApplicationService держит снапшот calendars в конструкторе

Не баг: правила больничных (sickLeaveRules) валидируют, что календарь загружен
для всех лет, которые покрывает больничный, поэтому service получает
`calendars` как внешнее состояние. `useSickLeaves` пересоздаёт service через
`useMemo` при каждом изменении `calendars`, снапшот актуален.
Это единственное отступление от паттерна «service зависит только от
репозитория». Оставить как есть; при желании — передавать calendars
аргументом `add`/`update`, но выигрыш чисто косметический.

## JS чанк 718 KB

Один чанк без code-splitting. Не критично для SPA, но можно рассмотреть
`manualChunks` по фичам.

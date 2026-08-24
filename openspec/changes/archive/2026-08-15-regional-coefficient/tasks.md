# Tasks: Районный коэффициент

## 1. Типы и валидация

- [x] 1.1 Создать `RegionalCoefficientChange` интерфейс и zod-схему в `shared/types/regional-coefficient.ts`
- [x] 1.2 Добавить тип `RegionalCoefficientPercent` (number) с валидацией

## 2. Репозиторий и хранилище

- [x] 2.1 Создать репозиторий коэффициентов (localStorage key `salary-buddy-regional-coefficients` с Zod-валидацией)
- [x] 2.2 Подключить репозиторий в `src/app/repositories.ts`

## 3. Модель и сервисы

- [x] 3.1 Создать `src/features/regional-coefficient/model/RegionalCoefficientService.ts` — CRUD операции
- [x] 3.2 Создать `src/features/regional-coefficient/model/RegionalCoefficientApplicationService.ts` — валидация и сохранение
- [x] 3.3 Создать `src/features/regional-coefficient/model/RegionalCoefficientProvider.ts` + context
- [x] 3.4 Реализовать `getCoefficientForDate()` — поиск коэффициента по дате (аналог `getSalaryForDate`)

## 4. Хук

- [x] 4.1 Создать `src/features/regional-coefficient/hooks/useRegionalCoefficient.ts` — публичный хук для UI

## 5. Интеграция в расчётный pipeline

- [x] 5.1 Применить коэффициент к дневному окладу в `calculatePeriodGross()` (аванс/зарплата)
- [x] 5.2 Передать коэффициент в `buildSalaryEvents()` через `BuildSalaryParams`
- [x] 5.3 Обновить fallback расчёт в `calculation/sick-leave.ts` — оклад × (1 + pct/100) × 24 / 730
- [x] 5.4 Убедиться, что `calculation/vacation.ts` корректно использует gross с коэффициентом (без повторного применения)

## 6. UI компоненты

- [x] 6.1 Создать `src/features/regional-coefficient/ui/RegionalCoefficientManager.tsx` — список изменений + форма
- [x] 6.2 Создать `RegionalCoefficientCard.tsx` — карточка одной записи
- [x] 6.3 Создать `RegionalCoefficientForm.tsx` — форма добавления/редактирования с валидацией
- [x] 6.4 Добавить collapsible секцию в `App.tsx`

## 7. Подключение в App

- [x] 7.1 Подключить `RegionalCoefficientProvider` в дерево провайдеров
- [x] 7.2 Передать коэффициент в `PaymentsProvider` для пересчёта
- [x] 7.3 Добавить секцию в layout

## 8. Import/Export

- [x] 8.1 Включить `regionalCoefficients` в экспорт (`collectExportData`)
- [x] 8.2 Добавить импорт и валидацию `regionalCoefficients` в `importFromFile`

## 9. Отображение коэффициента в деталях выплаты

- [x] 9.1 Добавить поле `regionalCoefficientPercent` в `Payment` и `PaymentSchema`
- [x] 9.2 Сохранять процент коэффициента на событиях аванс/зарплата в `buildSalaryEvents()`
- [x] 9.3 Передавать коэффициент в `buildPaymentsWithNdfl()` → `Payment.regionalCoefficientPercent`
- [x] 9.4 Отображать «Районный коэф.: X%» в `PaymentDetailsPanel` после строки «Оклад»

## 10. Тесты

- [x] 10.1 Тесты `getCoefficientForDate()` — поиск по истории
- [x] 10.2 Тесты расчёта gross с коэффициентом — период, аванс, зарплата
- [x] 10.3 Тесты НДФЛ с gross, включающим коэффициент
- [x] 10.4 Тесты fallback расчёта больничных с коэффициентом (реальный больничный при нулевом доходе)
- [x] 10.5 Интеграционный тест: полный пересчёт платежей с коэффициентом

## 11. Верификация

- [x] 11.1 Запустить `pnpm lint` и `pnpm test:run`
- [x] 11.2 Визуальная проверка: коэффициент 0% не меняет расчёт
- [x] 11.3 Визуальная проверка: коэффициент 30% корректно увеличивает gross и НДФЛ
- [x] 11.4 Визуальная проверка: коэффициент отображается в деталях выплаты

## 12. Соответствие законодательству

- [x] 12.1 Отдельная налоговая база для части РК: 13% до 5 млн ₽ в год, 15% свыше; с 2025, для 2024 — общая шкала (п. 6.2 ст. 210, п. 1.2 ст. 224 НК РФ)
- [x] 12.2 Определять часть РК аванса/зарплаты (gross × pct / (100 + pct)) и передавать в расчёт НДФЛ
- [x] 12.3 Применить коэффициент к премиям и доплатам (gross = базовая сумма × (1 + pct/100)) в `buildSalaryEvents()`/`addBonusEvents()`
- [x] 12.4 Применить коэффициент к доплате до оклада (дневной оклад с коэффициентом) в `calculation/sick-leave.ts`
- [x] 12.5 С 2026: выделять часть РК отпускных, «Пособия работодателя» и доплаты в отдельную базу НДФЛ (письмо ФНС от 18.02.2026 № ЗГ-35-11/1411@)
- [x] 12.6 Изменить верхнюю границу валидации коэффициента с 200% на 100% (zod-схема, `regionalCoefficientRules.ts`, `RegionalCoefficientForm.tsx`)
- [x] 12.7 Тесты: отдельная база НДФЛ (включая пересечение порога 5 млн), РК на премиях/доплатах, fallback больничного с коэффициентом, доплата до оклада с коэффициентом

## 13. Лимиты СДЗ по годам

- [x] 13.1 Таблица МРОТ и предельных баз взносов по годам (2022–2026), лимиты СДЗ годозависимые: MIN = МРОТ × 24 / 730, MAX = (база (N-1) + база (N-2)) / 730; для годов вне таблицы — ближайший год

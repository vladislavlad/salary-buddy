# Tasks: Районный коэффициент

## 1. Типы и валидация

- [x] 1.1 Создать `RegionalCoefficientChange` интерфейс и zod-схему в `shared/types/regional-coefficient.ts`
- [x] 1.2 Добавить тип `RegionalCoefficientPercent` (number, 0-200) с валидацией

## 2. Репозиторий и хранилище

- [x] 2.1 Создать `src/features/regional-coefficient/repository/LocalStorageRegionalCoefficientRepository.ts`
- [x] 2.2 Настроить localStorage key `salary-buddy-regional-coefficients` с Zod-валидацией

## 3. Модель и сервисы

- [x] 3.1 Создать `src/features/regional-coefficient/model/RegionalCoefficientService.ts` — CRUD операции
- [x] 3.2 Создать `src/features/regional-coefficient/model/RegionalCoefficientApplicationService.ts` — валидация и сохранение
- [x] 3.3 Создать `src/features/regional-coefficient/model/RegionalCoefficientProvider.ts` + context
- [x] 3.4 Реализовать `getCoefficientForDate()` — поиск коэффициента по дате (аналог `getSalaryForDate`)

## 4. Хук

- [x] 4.1 Создать `src/features/regional-coefficient/hooks/useRegionalCoefficient.ts` — публичный хук для UI

## 5. Интеграция в расчётный pipeline

- [x] 5.1 Модифицировать `getSalaryForDate()` в `calculation/salary.ts` — принимать коэффициент, возвращать effective salary
- [x] 5.2 Передать коэффициент в `buildSalaryEvents()` через `BuildSalaryParams`
- [x] 5.3 Обновить fallback расчёт в `calculation/sick-leave.ts` — применять коэффициент к окладу
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
- [x] 10.4 Тесты fallback больничных с коэффициентом
- [x] 10.5 Интеграционный тест: полный пересчёт платежей с коэффициентом

## 11. Верификация

- [x] 11.1 Запустить `pnpm lint` и `pnpm test:run`
- [x] 11.2 Визуальная проверка: коэффициент 0% не меняет расчёт
- [x] 11.3 Визуальная проверка: коэффициент 30% корректно увеличивает gross и НДФЛ
- [x] 11.4 Визуальная проверка: коэффициент отображается в деталях выплаты

# Design: Decompose YearCalendar

## Context

`YearCalendar.tsx` (891 строк) содержит три компонента (`MonthGrid`, `ItemPopover`, `PaymentDetails`) и набор утилит в одном файле. UI напрямую импортирует `grossFromNet()` из `features/payments/model/calculation-engine`, что нарушает границу слоёв: компонент зависит от внутренней функции расчётного движка.

## Goals / Non-Goals

**Goals:**
- Разделить файл на компоненты по одному файлу, каждый < 200 строк
- Убрать прямой импорт `grossFromNet` из UI — инкапсулировать через хук
- Вынести константы и утилиты в отдельный модуль
- Сохранить визуальное поведение без изменений

**Non-Goals:**
- Не менять расчётную логику (grossFromNet, НДФЛ)
- Не менять внешний вид календаря
- Не рефакторить MonthGrid-логику (сетка 6 недель, скрытие хвостовых рядов) — только вынести в отдельный файл

## Decisions

### D1: Файловая структура

Каждый компонент → отдельный файл в `features/calendar/ui/`:

```
calendar/ui/
├── YearCalendar.tsx          # оркестратор, ~50 строк
├── MonthGrid.tsx             # сетка месяца, ~200 строк
├── DayCell.tsx               # ячейка дня с бейджами, ~100 строк
├── PaymentDetailsPanel.tsx   # поповер деталей выплат (был ItemPopover), ~350 строк
├── FactEditorInline.tsx      # инлайн-редактор факта внутри панели, ~80 строк
└── calendar-payment-utils.ts # константы и хелперы, ~100 строк
```

**Почему не Dialog для FactEditor:** текущий UX — инлайн-редактирование в поповере. Замена на Dialog изменит поведение (модальность, фокус), что выходит за рамки рефакторинга.

### D2: Хук `useFactEditor` вместо прямого импорта `grossFromNet`

Создать хук `features/calendar/hooks/useFactEditor.ts`, который:
- Принимает `payments` и `setFact` из store
- Возвращает `{ editingContext, editPreviewGrossKop, startEdit, confirmFact, cancelEdit }`
- Инкапсулирует вызов `grossFromNet()` внутри себя

Компонент `PaymentDetailsPanel` зависит от хука, а не от calculation-engine напрямую.

**Альтернатива:** обернуть `grossFromNet` в функцию-обёртку в utils. Отклонено — хук лучше подходит для React-компонентов с state (editingId, editValue).

### D3: Вынос утилит в `calendar-payment-utils.ts`

Константы и функции без зависимостей от React:
- `PAYMENT_PRIORITY`, `PAY_VAR_SUFFIX`, `PAYMENT_COLOR_VAR`
- `getHighestPriority()`, `getPaymentLabel()`
- `getStripeStyle()`

**Почему не в shared:** используется только внутри calendar feature.

### D4: DayCell как отдельный компонент

Вынести рендер ячейки из цикла MonthGrid. Принимает props: день, платежи, флаги (отпуск/больничный), callback для клика.

**Почему не в shared:** специфична для календаря Salary Buddy, зависит от типов Payment и CalendarData.

## Risks / Trade-offs

[Risk] Разделение на файлы увеличит количество импортов → **Mitigation**: каждый файл импортирует только то, что нужно; утилиты без зависимостей

[Risk] Переименование `ItemPopover` → `PaymentDetailsPanel` может сломать ссылки → **Mitigation**: в текущем файле нет внешних ссылок на этот компонент (он не экспортируется)

[Trade-off] Хук `useFactEditor` создаёт зависимость calendar feature от payments calculation-engine через хук, а не напрямую. Зависимость остаётся, но инкапсулирована в hook layer, что соответствует архитектуре: hooks могут зависеть от model других фич.

# Decompose YearCalendar

## Why

`YearCalendar.tsx` — 891 строка в одном файле. Смешаны рендер сетки календаря, отображение деталей платежей и редактирование фактов выплат (net → gross). Прямой импорт `grossFromNet()` из расчётного движка в UI нарушает границу слоёв: компонент зависит от внутренней функции calculation-engine.

## What Changes

- Разбить `YearCalendar.tsx` на отдельные компоненты:
  - **MonthGrid** — рендер сетки месяца (уже вынесен как функция, но остаётся в том же файле)
  - **DayCell** — ячейка дня с бейджами платежей, отпуска, больничного
  - **ItemPopover** → **PaymentDetailsPanel** — панель деталей выплат за день (переместить в отдельный файл)
  - **FactEditorDialog** — диалог редактирования факта платежа; `grossFromNet` вызывается через хук, а не прямой импорт из calculation-engine
- Вынести вспомогательные функции (`getHighestPriority`, `getPaymentLabel`, `PAYMENT_PRIORITY`, `PAY_VAR_SUFFIX`) в отдельный модуль `calendar-payment-utils.ts`
- Создать хук `useFactEditor()` для инкапсуляции логики net → gross и сохранения факта

## Capabilities

### New Capabilities
(none)

### Modified Capabilities
(none — это чистый рефакторинг, поведение не меняется)

## Impact

- `src/features/calendar/ui/YearCalendar.tsx` — разбивается на 4-5 файлов
- Новый файл: `src/features/calendar/ui/calendar-payment-utils.ts`
- Новый хук: `src/features/calendar/hooks/useFactEditor.ts`
- Убирается прямой импорт `grossFromNet` из `features/payments/model/calculation-engine` в UI
- Не затрагивает расчётную логику, не меняет поведение

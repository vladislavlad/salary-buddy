# Tasks: Decompose YearCalendar

## 1. Вынести утилиты в `calendar-payment-utils.ts`

- [x] 1.1 Создать `features/calendar/ui/calendar-payment-utils.ts` с константами `PAYMENT_PRIORITY`, `PAY_VAR_SUFFIX`, `PAYMENT_COLOR_VAR`, `MONTH_NAMES`
- [x] 1.2 Перенести функции `getHighestPriority()`, `getPaymentLabel()`, `getStripeStyle()` в новый файл
- [x] 1.3 Обновить импорты в `YearCalendar.tsx` — заменить локальные константы на импорт из utils
- [x] 1.4 Запустить `pnpm lint` и `pnpm test:run` для проверки

## 2. Создать хук `useFactEditor`

- [x] 2.1 Создать `features/calendar/hooks/useFactEditor.ts` с сигнатурой `(payments, setFact) => { editingContext, editPreviewGrossKop, startEdit, confirmFact, cancelEdit, removeFact, confirmWithPlan }`
- [x] 2.2 Перенести логику `editingContext`, `editPreviewGrossKop` из `ItemPopover` в хук
- [x] 2.3 Перенести обработчики `startEdit`, `confirmFact`, `cancelEdit`, `removeFact`, `confirmWithPlan` в хук
- [x] 2.4 Запустить `pnpm lint` для проверки типов

## 3. Вынести `DayCell` в отдельный файл

- [x] 3.1 Создать `features/calendar/ui/DayCell.tsx` с интерфейсом props: день, платежи, флаги (отпуск/больничный), callback клика, ref для поповера
- [x] 3.2 Перенести рендер ячейки из цикла MonthGrid в DayCell
- [x] 3.3 Обновить MonthGrid — заменить inline-рендер на `<DayCell>`
- [x] 3.4 Запустить `pnpm lint` для проверки

## 4. Вынести `MonthGrid` в отдельный файл

- [x] 4.1 Создать `features/calendar/ui/MonthGrid.tsx`, перенести компонент MonthGrid целиком
- [x] 4.2 Обновить импорты: утилиты из `calendar-payment-utils`, DayCell из соседнего файла
- [x] 4.3 Обновить YearCalendar — импортировать MonthGrid из нового файла
- [x] 4.4 Запустить `pnpm lint` для проверки

## 5. Вынести `PaymentDetailsPanel` (был ItemPopover) в отдельный файл

- [x] 5.1 Создать `features/calendar/ui/PaymentDetailsPanel.tsx`, перенести компонент ItemPopover
- [x] 5.2 Подключить хук `useFactEditor` вместо прямой логики grossFromNet
- [x] 5.3 Убрать импорт `grossFromNet` из calculation-engine — он теперь только в хуке
- [x] 5.4 Обновить YearCalendar — импортировать PaymentDetailsPanel из нового файла
- [x] 5.5 Запустить `pnpm lint` для проверки

## 6. Вынести `FactEditorInline` и `PaymentDetails`

- [x] 6.1 Создать `features/calendar/ui/FactEditorInline.tsx` — инлайн-редактор факта (input + кнопки)
- [x] 6.2 Перенести компонент PaymentDetails в FactEditorInline или оставить как часть PaymentDetailsPanel (решить по размеру)
- [x] 6.3 Обновить импорты в PaymentDetailsPanel
- [x] 6.4 Запустить `pnpm lint` для проверки

## 7. Очистка и финальная проверка

- [x] 7.1 Удалить старый `YearCalendar.tsx` (891 строк), оставить только оркестратор (~50 строк)
- [x] 7.2 Проверить, что все файлы < 200 строк
- [x] 7.3 Запустить `pnpm lint`, `pnpm test:run`
- [x] 7.4 Визуальная проверка в dev — календарь рендерится корректно, поповер открывается, факт редактируется

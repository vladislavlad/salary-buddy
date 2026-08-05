# Design: Decompose `calculateAll`

## Context

`features/payments/model/calculation/index.ts` содержит функцию `calculateAll()` из 485 строк, которая последовательно выполняет пять фаз расчёта. Функция принимает один объект `CalculateAllInput` и возвращает `Payment[]`. Внутри — вложенные циклы по годам/месяцам, итеративная стабилизация отпускных, расчёт больничных и применение НДФЛ.

## Goals / Non-Goals

**Goals:**
- Разбить `calculateAll` на 5 функций модульного уровня, каждая из которых соответствует одной фазе расчёта
- Подписать типы входных/выходных данных каждой фазы (интерфейсы для параметров)
- Сохранить идентичное поведение — существующие тесты должны проходить без изменений
- Сделать `calculateAll` ~50-строчным оркестратором с читаемыми шагами

**Non-Goals:**
- Изменение логики расчёта (формулы, распределение, НДФЛ)
- Перенос фаз в отдельные файлы — все функции остаются в `index.ts`
- Добавление unit-тестов на отдельные фазы (можно позже, но не в этом чейндже)

## Decisions

### 1. Каждая фаза — отдельная функция с явными параметрами

Каждая фаза получает только то, что ей нужно, а не весь `CalculateAllInput`. Это делает зависимости каждой фазы видимыми и упрощает понимание.

```typescript
function buildSalaryEvents(
  params: BuildSalaryParams,
): { events: RawEvent[]; paymentDatesByMonth: Map<string, MonthPaymentDates> }

function buildBonusEvents(
  bonuses: Bonus[],
  sortedChanges: SalaryChange[],
  calendarsByYear: Map<number, CalendarData>,
  minYear: number,
  maxYear: number,
): RawEvent[]

function stabilizeVacations(
  events: RawEvent[],
  vacations: Vacation[],
  factBySource: Map<string, number>,
  calendarsByYear: Map<number, CalendarData>,
  minYear: number,
  maxYear: number,
): RawEvent[]

function calculateSickLeavePhase(
  events: RawEvent[],
  sickLeaves: SickLeave[],
  sickLeaveSettings: SickLeaveSettings | undefined,
  calendarsByYear: Map<number, CalendarData>,
  sortedChanges: SalaryChange[],
  paymentDatesByMonth: Map<string, MonthPaymentDates>,
): RawEvent[]

function applyNdflAndBuildPayments(
  events: RawEvent[],
  factBySource: Map<string, number>,
  existingPayments: Payment[],
  recalcFrom: LocalDate | undefined,
): Payment[]
```

### 2. `factBySource` строится в оркестраторе до фаз

Карта фактов из существующих платежей нужна в фазах отпускных, больничных и НДФЛ. Строить её один раз в `calculateAll` и передавать в каждую фазу — проще, чем дублировать логику.

### 3. Фаза отпуска возвращает новый массив событий

Текущий код модифицирует `events.length = 0; events.push(...)` внутри цикла стабилизации. Новая функция принимает текущие события и возвращает обновлённый массив после стабилизации, не мутируя входной параметр.

### 4. Фаза больничных фильтрует свои события из входящих событий

Текущий код делает `events.filter(e => !e.type.startsWith("sick-leave"))` перед расчётом. Эта логика переедет внутрь функции — оркестратор не должен знать о внутренних деталях фазы.

### 5. Интерфейс `BuildSalaryParams` для параметров фазы зарплаты

Фаза зарплаты принимает больше всего параметров (settings, surcharges, vacations, sickLeaves, calendarsByYear, sortedChanges). Группировка в интерфейс улучшает читаемость вызова и упрощает добавление новых параметров в будущем.

## Risks / Trade-offs

- [Риск: регрессия при рефакторинге] → Митигация: существующие end-to-end тесты должны покрыть поведение; запускать `pnpm test:run` после каждого шага
- [Trade-off: функции остаются в одном файле] → Перенос в отдельные файлы был бы чище, но увеличил бы объём изменений и риск ошибок импорта. Оставляем в `index.ts` для минимального риска.

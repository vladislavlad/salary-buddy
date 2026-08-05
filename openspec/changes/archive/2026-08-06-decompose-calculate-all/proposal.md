# Decompose `calculateAll` into phase functions

## Why

`calculateAll()` в `features/payments/model/calculation/index.ts` — 485 строк, оркестрирует пять фаз расчёта: генерация событий аванс/зарплата, премии, итеративная стабилизация отпускных, больничные, НДФЛ. Функция слишком велика для удобного чтения, тестирования отдельных фаз и локального изменения одной из них.

## What Changes

- Вынести каждую фазу расчёта в отдельную функцию модульного уровня:
  - `buildSalaryEvents()` — генерация событий аванс/зарплата по рабочим месяцам
  - `buildBonusEvents()` — добавление премий за год
  - `stabilizeVacations()` — итеративный расчёт отпускных (до стабилизации, max 5 итераций)
  - `calculateSickLeavePhase()` — расчёт больничных после стабилизации отпускных
  - `applyNdflAndBuildPayments()` — применение НДФЛ и сборка финальных Payment
- `calculateAll` станет ~50-строчным оркестратором, вызывающим фазы последовательно
- Подписать типы входных/выходных данных каждой фазы (интерфейсы для event-фабрик)
- Не изменить логику расчёта — только композицию функций

## Capabilities

### New Capabilities

(нет — чистый рефакторинг, поведение не меняется)

### Modified Capabilities

(нет — spec-level behavior не изменяется)

> `skip_specs: true` установлен в `.openspec.yaml`, так как это чистый рефакторинг без изменения наблюдаемого поведения.

## Impact

- **Affected code**: `features/payments/model/calculation/index.ts` (единственный файл, где происходит декомпозиция)
- **No API changes**: публичный интерфейс `calculateAll(input)` остаётся неизменным
- **No test changes needed**: существующие тесты покрывают поведение end-to-end; при желании можно добавить unit-тесты на отдельные фазы
- **No dependency changes**

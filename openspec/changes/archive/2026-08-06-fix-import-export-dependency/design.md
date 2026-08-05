# Design: Fix import-export dependency on wiring layer

## Context

Текущее состояние:
- `exportImport.ts` уже использует DI через интерфейс `ExportImportRepositories`
- Но конструирование объекта репозиториев происходит в двух местах с импортом из `app/repositories`:
  - `storage.ts` — delegation layer (102 строки, каждая функция делегирует один вызов)
  - `ImportExportPanel.tsx:32-41` — модульный уровень, создаёт `repos` объект
- Направление зависимостей нарушено: фича → app-слой

## Goals / Non-Goals

**Goals:**
- Фича `import-export` не импортирует из `app/`
- Реализация export/import остаётся неизменной (внешнее поведение)
- Код становится тестируемым в изоляции

**Non-Goals:**
- Не менять API `exportImport.ts` — интерфейс `ExportImportRepositories` уже правильный
- Не трогать расчётную логику платежей
- Не менять UI-компоненты за пределами import-export фичи

## Decisions

### 1. Передача репозиториев через React context

**Решение**: Создать `ExportImportRepositoriesContext` в `features/import-export/model/`, который предоставляет `ExportImportRepositories` через React context.

**Альтернативы рассмотрены:**
- **Props drilling** — потребовало бы прокидывать repos через все родительские компоненты до `ImportExportPanel`. Не подходит, так как компонент глубоко в дереве и не имеет промежуточных потребителей.
- **Функциональный параметр (HOC)** — избыточно для одного объекта; context проще и соответствует паттерну проекта (остальные фичи используют context).

### 2. Конструирование репозиториев в AppProviders.tsx

**Решение**: Создать объект `ExportImportRepositories` в `app/AppProviders.tsx`, обернуть приложение в `ExportImportRepositoriesProvider`.

**Альтернативы рассмотрены:**
- **Отдельный файл `app/import-export-repos.ts`** — создаёт ещё один модуль wiring, что усложняет навигацию. Все репозитории уже импортируются в AppProviders для других провайдеров.

### 3. Удаление storage.ts целиком

**Решение**: Файл `storage.ts` не нужен — он дублирует функциональность `exportImport.ts`, который уже принимает `ExportImportRepositories`. Все вызовы из `storage.ts` заменяются на прямые вызовы функций из `exportImport.ts` с инжектированным объектом репозиториев.

## Risks / Trade-offs

- [Контекст добавляет re-render] → Реализация минимальна (только value, без state), не вызывает лишних ререндеров. Объект репозиториев создаётся один раз на уровне AppProviders и стабилен.
- [Тестирование UI требует мока context] → Это ожидаемо и соответствует паттерну проекта: другие фичи тоже мокают свои контексты в тестах.
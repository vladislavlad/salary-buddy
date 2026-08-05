# Fix import-export dependency on wiring layer

## Why

Фича `import-export` импортирует репозитории из `app/repositories`, что нарушает направление зависимостей: фича зависит от app-слоя, который должен быть выше по иерархии. Это делает невозможным тестирование import-export в изоляции и создаёт циклическую зависимость между слоями.

## What Changes

- Удалить `features/import-export/model/storage.ts` — пустой delegation layer (102 строки, каждая функция делегирует один вызов репозиторию)
- Извлечь конструирование `ExportImportRepositories` из `ImportExportPanel.tsx` в app-слой
- Передать репозитории фиче через React context или props
- Обновить `AppProviders.tsx` для wiring репозиториев import-export

## Capabilities

Нет изменений на уровне требований. Внешне наблюдаемое поведение (экспорт в JSON, импорт из JSON, очистка данных) остаётся неизменным — это чистый архитектурный рефакторинг направления зависимостей.

## Impact

- `features/import-export/model/storage.ts` — удалён
- `features/import-export/model/exportImport.ts` — без изменений (уже использует DI через `ExportImportRepositories`)
- `features/import-export/ui/ImportExportPanel.tsx` — получает репозитории из context вместо импорта из `app/repositories`
- `app/AppProviders.tsx` — добавлен provider для injection репозиториев
- Новые файлы: `features/import-export/model/ExportImportRepositoriesContext.ts` (context + provider)

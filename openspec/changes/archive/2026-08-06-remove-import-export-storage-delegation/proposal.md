# Remove import-export storage delegation layer

## Why

`features/import-export/model/storage.ts` (102 строк) — пустой delegation layer: каждая функция делегирует один вызов репозиторию без добавления семантики. Кроме того, он импортирует конкретные экземпляры из `app/repositories`, что нарушает направление зависимостей: фича зависит от app-слоя.

## What Changes

- Удалён файл `features/import-export/model/storage.ts`
- Репозитории передаются в `exportImport.ts` как параметры (dependency injection)
- `collectExportData()` и `importFromFile()` принимают объект с репозиториями вместо импорта из storage
- UI-компонент `ImportExportPanel.tsx` получает репозитории через props или хук, передаёт их в модель

## Capabilities

### New Capabilities

(нет — это чистый рефакторинг)

### Modified Capabilities

(нет — внешнее поведение import-export не меняется)

## Impact

- `features/import-export/model/storage.ts` — удалён
- `features/import-export/model/exportImport.ts` — сигнатуры функций принимают репозитории как параметры
- `features/import-export/ui/ImportExportPanel.tsx` — получает репозитории из app-слоя, передаёт в модель
- `app/repositories.ts` — становится единственным местом, где создаются и связываются репозитории с import-export

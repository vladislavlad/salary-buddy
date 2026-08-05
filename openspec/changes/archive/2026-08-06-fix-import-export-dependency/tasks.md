# Tasks: Fix import-export dependency on wiring layer

## 1. Создать ExportImportRepositoriesContext

- [x] 1.1 Создать `features/import-export/model/ExportImportRepositoriesContext.tsx` с context, provider и хуком `useExportImportRepositories`
- [x] 1.2 Экспортировать `ExportImportRepositoriesProvider` и `useExportImportRepositories` из нового файла

## 2. Подключить контекст в AppProviders

- [x] 2.1 В `app/AppProviders.tsx` импортировать `ExportImportRepositoriesProvider`
- [x] 2.2 Создать объект `ExportImportRepositories` из существующих репозиториев (уже импортируются для других провайдеров)
- [x] 2.3 Обернуть дерево компонентов в `<ExportImportRepositoriesProvider value={repos}>`

## 3. Обновить ImportExportPanel

- [x] 3.1 Заменить импорт из `app/repositories` на `useExportImportRepositories()`
- [x] 3.2 Удалить конструирование объекта `repos` на модульном уровне (строки 32-41)
- [x] 3.3 Обновить вызовы функций, чтобы использовать repos из хука

## 4. Удалить storage.ts

- [x] 4.1 Проверить, что нигде не импортируется `features/import-export/model/storage`
- [x] 4.2 Удалить файл `features/import-export/model/storage.ts`

## 5. Верификация

- [x] 5.1 Запустить `pnpm lint` — убедиться, что линтинг проходит
- [x] 5.2 Запустить `pnpm test:run` — убедиться, что тесты проходят
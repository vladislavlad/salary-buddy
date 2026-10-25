const pendingUpdates = new WeakMap<object, Promise<void>>();

/** Сериализует обновления одного репозитория, в том числе из разных сервисов. */
export function serializeRepositoryUpdate<T>(
  repository: object,
  update: () => Promise<T>,
): Promise<T> {
  const previous = pendingUpdates.get(repository) ?? Promise.resolve();
  const result = previous.then(update);
  const settled = result.then(
    () => undefined,
    () => undefined,
  );
  pendingUpdates.set(repository, settled);
  void settled.then(() => {
    if (pendingUpdates.get(repository) === settled) {
      pendingUpdates.delete(repository);
    }
  });
  return result;
}

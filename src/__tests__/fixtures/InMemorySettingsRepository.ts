export class InMemorySettingsRepository<T> {
  constructor(public saved: T | null = null) {}

  async get(): Promise<T | null> {
    return this.saved;
  }

  async save(settings: T): Promise<void> {
    this.saved = settings;
  }

  async clear(): Promise<void> {
    this.saved = null;
  }
}

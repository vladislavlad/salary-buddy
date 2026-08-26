import { z } from "zod";

/**
 * Универсальный repository для одиночного объекта в localStorage
 * (настройки фич: календаря, выплат, больничных).
 */
export class LocalStorageSingleRepository<T> {
  constructor(
    private readonly storageKey: string,
    // Input = unknown: схемы с .default() имеют input-тип уже с опциональными
    // полями, а ZodType<T> по умолчанию требует Input = T (инвариантность).
    private readonly schema: z.ZodType<T, z.ZodTypeDef, unknown>,
  ) {}

  async get(): Promise<T | null> {
    try {
      const raw = localStorage.getItem(this.storageKey);
      if (!raw) return null;
      return this.schema.parse(JSON.parse(raw));
    } catch {
      return null;
    }
  }

  async save(value: T): Promise<void> {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(value));
    } catch {
      console.warn(`Не удалось сохранить данные в ${this.storageKey}`);
    }
  }

  async clear(): Promise<void> {
    try {
      localStorage.removeItem(this.storageKey);
    } catch {
      console.warn(`Не удалось очистить ${this.storageKey}`);
    }
  }
}

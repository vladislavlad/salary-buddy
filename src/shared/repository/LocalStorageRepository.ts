import { z } from "zod";
import type { Repository } from "./Repository";

function jsonReplacer(_key: string, value: unknown): unknown {
  if (
    value &&
    typeof value === "object" &&
    "toString" in value &&
    value.constructor?.name === "PlainDate"
  ) {
    return String(value);
  }
  return value;
}

/** Универсальный repository поверх localStorage. */
export class LocalStorageRepository<
  T extends { id: string },
> implements Repository<T, string> {
  constructor(
    private readonly storageKey: string,
    private readonly schema: z.ZodType<T[]>,
  ) {}

  async findAll(): Promise<T[]> {
    try {
      const raw = localStorage.getItem(this.storageKey);
      if (!raw) return [];
      return this.schema.parse(JSON.parse(raw));
    } catch {
      return [];
    }
  }

  async findById(id: string): Promise<T | null> {
    const items = await this.findAll();
    return items.find((item) => item.id === id) ?? null;
  }

  async save(item: T): Promise<void> {
    const items = await this.findAll();
    const index = items.findIndex((existing) => existing.id === item.id);
    const next =
      index === -1
        ? [...items, item]
        : items.map((existing) => (existing.id === item.id ? item : existing));
    await this.saveAll(next);
  }

  async saveAll(items: T[]): Promise<void> {
    try {
      localStorage.setItem(
        this.storageKey,
        JSON.stringify(items, jsonReplacer),
      );
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

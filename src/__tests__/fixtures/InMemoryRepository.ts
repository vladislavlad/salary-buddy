import type { Repository } from "@/shared/repository/Repository";

export class InMemoryRepository<
  T extends { id: string },
> implements Repository<T> {
  constructor(private items: T[] = []) {}

  async findAll(): Promise<T[]> {
    return this.items;
  }

  async findById(id: string): Promise<T | null> {
    return this.items.find((item) => item.id === id) ?? null;
  }

  async save(item: T): Promise<void> {
    const exists = this.items.some((current) => current.id === item.id);
    this.items = exists
      ? this.items.map((current) => (current.id === item.id ? item : current))
      : [...this.items, item];
  }

  async saveAll(items: T[]): Promise<void> {
    this.items = items;
  }

  async clear(): Promise<void> {
    this.items = [];
  }
}

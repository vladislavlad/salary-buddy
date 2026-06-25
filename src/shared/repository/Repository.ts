export interface Repository<T, ID = string> {
  findAll(): Promise<T[]>;
  findById(id: ID): Promise<T | null>;
  save(item: T): Promise<void>;
  saveAll(items: T[]): Promise<void>;
  clear(): Promise<void>;
}

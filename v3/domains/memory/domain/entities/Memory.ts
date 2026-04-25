/**
 * ADR-002: Domain-Driven Design structure
 *
 * Memory domain - Memory entity
 */

export interface Memory {
  id: string;
  key: string;
  value: any;
  namespace: string;
  tags?: string[];
  ttl?: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface MemoryRepository {
  find(key: string, namespace?: string): Promise<Memory | null>;
  search(query: string, namespace?: string): Promise<Memory[]>;
  create(memory: Omit<Memory, 'id' | 'createdAt' | 'updatedAt'>): Promise<Memory>;
  update(key: string, memory: Partial<Memory>): Promise<Memory>;
  delete(key: string, namespace?: string): Promise<void>;
}

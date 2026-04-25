/**
 * ADR-006: Unified Memory Service
 *
 * Central memory management for all V3 components
 */

export interface MemoryEntry {
  key: string;
  value: any;
  namespace?: string;
  tags?: string[];
  ttl?: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface MemoryService {
  store(entry: Omit<MemoryEntry, 'createdAt' | 'updatedAt'>): Promise<void>;
  retrieve(key: string, namespace?: string): Promise<MemoryEntry | null>;
  search(query: string, namespace?: string): Promise<MemoryEntry[]>;
  delete(key: string, namespace?: string): Promise<void>;
  clear(namespace?: string): Promise<void>;
}

export class UnifiedMemoryService implements MemoryService {
  private store: Map<string, MemoryEntry> = new Map();
  private indexes: Map<string, Set<string>> = new Map();

  private makeKey(key: string, namespace?: string): string {
    return namespace ? `${namespace}:${key}` : key;
  }

  async store(entry: Omit<MemoryEntry, 'createdAt' | 'updatedAt'>): Promise<void> {
    const key = this.makeKey(entry.key, entry.namespace);
    const memoryEntry: MemoryEntry = {
      ...entry,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.store.set(key, memoryEntry);

    // Index tags
    if (entry.tags) {
      entry.tags.forEach(tag => {
        if (!this.indexes.has(tag)) {
          this.indexes.set(tag, new Set());
        }
        this.indexes.get(tag)!.add(key);
      });
    }

    // Handle TTL
    if (entry.ttl) {
      setTimeout(() => this.delete(entry.key, entry.namespace), entry.ttl * 1000);
    }
  }

  async retrieve(key: string, namespace?: string): Promise<MemoryEntry | null> {
    const fullKey = this.makeKey(key, namespace);
    return this.store.get(fullKey) || null;
  }

  async search(query: string, namespace?: string): Promise<MemoryEntry[]> {
    const results: MemoryEntry[] = [];

    for (const entry of this.store.values()) {
      if (namespace && entry.namespace !== namespace) continue;

      // Simple keyword search
      const text = JSON.stringify(entry.value);
      if (text.toLowerCase().includes(query.toLowerCase())) {
        results.push(entry);
      }
    }

    return results;
  }

  async delete(key: string, namespace?: string): Promise<void> {
    const fullKey = this.makeKey(key, namespace);
    const entry = this.store.get(fullKey);

    if (entry?.tags) {
      entry.tags.forEach(tag => {
        this.indexes.get(tag)?.delete(fullKey);
      });
    }

    this.store.delete(fullKey);
  }

  async clear(namespace?: string): Promise<void> {
    if (namespace) {
      const keysToDelete: string[] = [];
      for (const key of this.store.keys()) {
        if (key.startsWith(`${namespace}:`)) {
          keysToDelete.push(key);
        }
      }
      keysToDelete.forEach(key => this.store.delete(key));
    } else {
      this.store.clear();
      this.indexes.clear();
    }
  }

  getStats(): { totalEntries: number; totalTags: number } {
    return {
      totalEntries: this.store.size,
      totalTags: this.indexes.size,
    };
  }
}

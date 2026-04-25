/**
 * In-Memory Provider - ADR-006
 *
 * Fast in-memory storage with LRU caching
 */

import { MemoryProvider, MemoryEntry } from './MemoryProvider';
import { LRUCache } from 'lru-cache';

export class InMemoryProvider implements MemoryProvider {
  private store: Map<string, MemoryEntry> = new Map();
  private indexes: Map<string, Set<string>> = new Map();
  private cache: LRUCache<string, MemoryEntry>;

  constructor(private maxSize = 10000) {
    this.cache = new LRUCache({
      max: maxSize,
      ttl: 1000 * 60 * 60, // 1 hour default TTL
      updateAgeOnGet: true,
      updateAgeOnHas: true
    });
  }

  async store(entry: Omit<MemoryEntry, 'createdAt' | 'updatedAt'>): Promise<void> {
    const key = this.makeKey(entry.key, entry.namespace);
    const memoryEntry: MemoryEntry = {
      ...entry,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.store.set(key, memoryEntry);
    this.cache.set(key, memoryEntry);

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

    // Check cache first
    const cached = this.cache.get(fullKey);
    if (cached) {
      return cached;
    }

    const entry = this.store.get(fullKey) || null;
    if (entry) {
      this.cache.set(fullKey, entry);
    }

    return entry;
  }

  async search(query: string, namespace?: string): Promise<MemoryEntry[]> {
    const results: MemoryEntry[] = [];
    const queryLower = query.toLowerCase();

    for (const entry of this.store.values()) {
      if (namespace && entry.namespace !== namespace) continue;

      // Search in key and value
      if (entry.key.toLowerCase().includes(queryLower)) {
        results.push(entry);
        continue;
      }

      const text = JSON.stringify(entry.value);
      if (text.toLowerCase().includes(queryLower)) {
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
    this.cache.delete(fullKey);
  }

  async clear(namespace?: string): Promise<void> {
    if (namespace) {
      const prefix = `${namespace}:`;
      const keysToDelete: string[] = [];

      for (const key of this.store.keys()) {
        if (key.startsWith(prefix)) {
          keysToDelete.push(key);
        }
      }

      keysToDelete.forEach(key => {
        this.store.delete(key);
        this.cache.delete(key);
      });
    } else {
      this.store.clear();
      this.indexes.clear();
      this.cache.clear();
    }
  }

  async getStats(): Promise<{ totalEntries: number; totalTags: number; memoryUsage?: number }> {
    return {
      totalEntries: this.store.size,
      totalTags: this.indexes.size,
      memoryUsage: process.memoryUsage().heapUsed
    };
  }

  async healthCheck(): Promise<boolean> {
    return true; // In-memory is always healthy
  }

  private makeKey(key: string, namespace?: string): string {
    return namespace ? `${namespace}:${key}` : key;
  }
}

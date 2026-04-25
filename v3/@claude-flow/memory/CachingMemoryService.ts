/**
 * Caching Memory Service - ADR-006
 *
 * Memory service with LRU cache and write-back policy
 */

import { MemoryProvider, MemoryEntry } from './providers/MemoryProvider';
import { LRUCache } from 'lru-cache';

export interface CacheOptions {
  maxSize?: number;
  ttl?: number;
  writeBackDelay?: number;
}

export class CachingMemoryService {
  private provider: MemoryProvider;
  private cache: LRUCache<string, MemoryEntry>;
  private writeBackQueue: Map<string, NodeJS.Timeout> = new Map();
  private writeBackDelay: number;

  constructor(provider: MemoryProvider, options: CacheOptions = {}) {
    this.provider = provider;
    this.writeBackDelay = options.writeBackDelay || 1000; // 1 second default

    this.cache = new LRUCache({
      max: options.maxSize || 1000,
      ttl: options.ttl || 1000 * 60 * 5, // 5 minutes default
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

    // Write-through: write to cache and provider immediately
    this.cache.set(key, memoryEntry);
    await this.provider.store(entry);

    // Clear any pending write-back
    const pendingWrite = this.writeBackQueue.get(key);
    if (pendingWrite) {
      clearTimeout(pendingWrite);
      this.writeBackQueue.delete(key);
    }
  }

  async retrieve(key: string, namespace?: string): Promise<MemoryEntry | null> {
    const fullKey = this.makeKey(key, namespace);

    // Check cache first
    const cached = this.cache.get(fullKey);
    if (cached) {
      return cached;
    }

    // Cache miss: get from provider
    const entry = await this.provider.retrieve(key, namespace);
    if (entry) {
      this.cache.set(fullKey, entry);
    }

    return entry;
  }

  async search(query: string, namespace?: string): Promise<MemoryEntry[]> {
    // Search is not cached, goes directly to provider
    return this.provider.search(query, namespace);
  }

  async delete(key: string, namespace?: string): Promise<void> {
    const fullKey = this.makeKey(key, namespace);

    // Delete from cache and provider
    this.cache.delete(fullKey);
    await this.provider.delete(key, namespace);

    // Clear any pending write-back
    const pendingWrite = this.writeBackQueue.get(fullKey);
    if (pendingWrite) {
      clearTimeout(pendingWrite);
      this.writeBackQueue.delete(fullKey);
    }
  }

  async clear(namespace?: string): Promise<void> {
    if (namespace) {
      // Clear all cache entries with this namespace prefix
      for (const key of this.cache.keys()) {
        if (key.startsWith(`${namespace}:`)) {
          this.cache.delete(key);
        }
      }
    } else {
      this.cache.clear();
    }

    await this.provider.clear(namespace);
  }

  async invalidateCache(key?: string, namespace?: string): Promise<void> {
    if (key) {
      const fullKey = this.makeKey(key, namespace);
      this.cache.delete(fullKey);
    } else if (namespace) {
      for (const cacheKey of this.cache.keys()) {
        if (cacheKey.startsWith(`${namespace}:`)) {
          this.cache.delete(cacheKey);
        }
      }
    } else {
      this.cache.clear();
    }
  }

  async warmCache(keys: Array<{ key: string; namespace?: string }>): Promise<void> {
    for (const { key, namespace } of keys) {
      const entry = await this.provider.retrieve(key, namespace);
      if (entry) {
        const fullKey = this.makeKey(key, namespace);
        this.cache.set(fullKey, entry);
      }
    }
  }

  getCacheStats(): { size: number; maxSize: number; usage: number } {
    return {
      size: this.cache.size,
      maxSize: this.cache.max,
      usage: this.cache.size / this.cache.max
    };
  }

  private makeKey(key: string, namespace?: string): string {
    return namespace ? `${namespace}:${key}` : key;
  }
}

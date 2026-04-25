/**
 * ADR-009: Hybrid Memory Backend
 *
 * Combines in-memory cache with persistent storage
 */

export interface MemoryBackend {
  get(key: string): Promise<any>;
  set(key: string, value: any, ttl?: number): Promise<void>;
  delete(key: string): Promise<void>;
  clear(): Promise<void>;
  has(key: string): Promise<boolean>;
}

export class InMemoryBackend implements MemoryBackend {
  private cache: Map<string, { value: any; expires?: number }> = new Map();

  async get(key: string): Promise<any> {
    const entry = this.cache.get(key);

    if (!entry) return null;

    if (entry.expires && Date.now() > entry.expires) {
      this.cache.delete(key);
      return null;
    }

    return entry.value;
  }

  async set(key: string, value: any, ttl?: number): Promise<void> {
    const entry: { value: any; expires?: number } = { value };

    if (ttl) {
      entry.expires = Date.now() + ttl * 1000;
    }

    this.cache.set(key, entry);
  }

  async delete(key: string): Promise<void> {
    this.cache.delete(key);
  }

  async clear(): Promise<void> {
    this.cache.clear();
  }

  async has(key: string): Promise<boolean> {
    const entry = this.cache.get(key);

    if (!entry) return false;

    if (entry.expires && Date.now() > entry.expires) {
      this.cache.delete(key);
      return false;
    }

    return true;
  }

  get size(): number {
    return this.cache.size;
  }
}

export class HybridMemoryBackend implements MemoryBackend {
  private primary: MemoryBackend;
  private secondary: MemoryBackend;
  private cache: InMemoryBackend;

  constructor(primary: MemoryBackend, secondary: MemoryBackend) {
    this.primary = primary;
    this.secondary = secondary;
    this.cache = new InMemoryBackend();
  }

  async get(key: string): Promise<any> {
    // Check cache first
    const cached = await this.cache.get(key);
    if (cached !== null) {
      return cached;
    }

    // Check primary backend
    const value = await this.primary.get(key);
    if (value !== null) {
      await this.cache.set(key, value);
      return value;
    }

    // Check secondary backend
    const fallback = await this.secondary.get(key);
    if (fallback !== null) {
      await this.cache.set(key, fallback);
      await this.primary.set(key, fallback); // Replicate to primary
      return fallback;
    }

    return null;
  }

  async set(key: string, value: any, ttl?: number): Promise<void> {
    // Write to all backends
    await Promise.all([
      this.cache.set(key, value, ttl),
      this.primary.set(key, value, ttl),
      this.secondary.set(key, value, ttl),
    ]);
  }

  async delete(key: string): Promise<void> {
    await Promise.all([
      this.cache.delete(key),
      this.primary.delete(key),
      this.secondary.delete(key),
    ]);
  }

  async clear(): Promise<void> {
    await Promise.all([
      this.cache.clear(),
      this.primary.clear(),
      this.secondary.clear(),
    ]);
  }

  async has(key: string): Promise<boolean> {
    return (await this.get(key)) !== null;
  }

  getStats(): {
    cacheSize: number;
    primaryAvailable: boolean;
    secondaryAvailable: boolean;
  } {
    return {
      cacheSize: this.cache.size,
      primaryAvailable: true,
      secondaryAvailable: true,
    };
  }
}

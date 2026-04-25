/**
 * Memory Provider Interface - ADR-006
 *
 * Abstract interface for memory storage providers
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

export interface MemoryProvider {
  /**
   * Store an entry in memory
   */
  store(entry: Omit<MemoryEntry, 'createdAt' | 'updatedAt'>): Promise<void>;

  /**
   * Retrieve an entry by key
   */
  retrieve(key: string, namespace?: string): Promise<MemoryEntry | null>;

  /**
   * Search for entries matching query
   */
  search(query: string, namespace?: string): Promise<MemoryEntry[]>;

  /**
   * Delete an entry by key
   */
  delete(key: string, namespace?: string): Promise<void>;

  /**
   * Clear all entries or entries in a namespace
   */
  clear(namespace?: string): Promise<void>;

  /**
   * Get provider statistics
   */
  getStats(): Promise<{ totalEntries: number; totalTags: number; memoryUsage?: number }>;

  /**
   * Check if provider is healthy
   */
  healthCheck(): Promise<boolean>;

  /**
   * Initialize provider connection
   */
  initialize?(): Promise<void>;

  /**
   * Close provider connection
   */
  close?(): Promise<void>;
}

export interface ProviderConfig {
  type: 'memory' | 'sqlite' | 'redis';
  options?: Record<string, unknown>;
}

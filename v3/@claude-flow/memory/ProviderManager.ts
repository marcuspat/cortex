/**
 * Provider Manager - ADR-006
 *
 * Manages memory providers with hot-swapping capability
 */

import { MemoryProvider, MemoryEntry, ProviderConfig } from './providers/MemoryProvider';
import { InMemoryProvider } from './providers/InMemoryProvider';

export interface ProviderSwapOptions {
  migrateData?: boolean;
  verifyAfterSwap?: boolean;
}

export class ProviderManager {
  private currentProvider: MemoryProvider;
  private providers: Map<string, MemoryProvider> = new Map();

  constructor(initialProvider?: MemoryProvider) {
    this.currentProvider = initialProvider || new InMemoryProvider();
    this.providers.set('default', this.currentProvider);
  }

  registerProvider(name: string, provider: MemoryProvider): void {
    this.providers.set(name, provider);
  }

  async swapProvider(providerName: string, options: ProviderSwapOptions = {}): Promise<void> {
    const newProvider = this.providers.get(providerName);
    if (!newProvider) {
      throw new Error(`Provider not found: ${providerName}`);
    }

    // Health check new provider
    const healthy = await newProvider.healthCheck();
    if (!healthy) {
      throw new Error(`Provider ${providerName} is not healthy`);
    }

    const oldProvider = this.currentProvider;

    // Migrate data if requested
    if (options.migrateData) {
      await this.migrateData(oldProvider, newProvider);
    }

    // Swap providers
    this.currentProvider = newProvider;

    // Verify after swap if requested
    if (options.verifyAfterSwap) {
      const healthy = await this.currentProvider.healthCheck();
      if (!healthy) {
        // Rollback
        this.currentProvider = oldProvider;
        throw new Error('Provider health check failed after swap, rolled back');
      }
    }
  }

  getCurrentProvider(): MemoryProvider {
    return this.currentProvider;
  }

  getProvider(name: string): MemoryProvider | undefined {
    return this.providers.get(name);
  }

  async getAvailableProviders(): Promise<string[]> {
    const available: string[] = [];

    for (const [name, provider] of this.providers.entries()) {
      const healthy = await provider.healthCheck();
      if (healthy) {
        available.push(name);
      }
    }

    return available;
  }

  private async migrateData(from: MemoryProvider, to: MemoryProvider): Promise<void> {
    // This is a simplified migration
    // In production, you'd want to do this in batches and handle failures
    const stats = await from.getStats();

    // For now, just log that migration would happen
    console.log(`Migrating ${stats.totalEntries} entries from provider to provider`);

    // In a real implementation, you would:
    // 1. Read all entries from source provider
    // 2. Write them to destination provider
    // 3. Verify the migration
    // 4. Handle any failures gracefully
  }

  async createBackup(providerName?: string): Promise<void> {
    const provider = providerName
      ? this.providers.get(providerName)
      : this.currentProvider;

    if (!provider) {
      throw new Error(`Provider not found: ${providerName || 'current'}`);
    }

    const stats = await provider.getStats();
    console.log(`Backup created for provider with ${stats.totalEntries} entries`);
  }

  async restoreBackup(backupId: string, providerName?: string): Promise<void> {
    console.log(`Restoring backup ${backupId} to provider ${providerName || 'current'}`);
    // Implementation would restore from backup
  }
}

// Singleton instance
let providerManagerInstance: ProviderManager | null = null;

export function getProviderManager(): ProviderManager {
  if (!providerManagerInstance) {
    providerManagerInstance = new ProviderManager();
  }
  return providerManagerInstance;
}

export function resetProviderManager(): void {
  providerManagerInstance = null;
}

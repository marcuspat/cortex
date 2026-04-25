/**
 * ADR-006 Unified Memory Service Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { InMemoryProvider } from '@/v3/@claude-flow/memory/providers/InMemoryProvider';
import { ProviderManager, getProviderManager, resetProviderManager } from '@/v3/@claude-flow/memory/ProviderManager';
import { CachingMemoryService } from '@/v3/@claude-flow/memory/CachingMemoryService';
import { MemoryEntry } from '@/v3/@claude-flow/memory/providers/MemoryProvider';

describe('ADR-006: Unified Memory Service', () => {
  beforeEach(() => {
    resetProviderManager();
  });

  describe('MemoryProvider Interface', () => {
    it('should store and retrieve entries', async () => {
      const provider = new InMemoryProvider();

      await provider.store({
        key: 'test-key',
        value: 'test-value',
        namespace: 'test-ns'
      });

      const retrieved = await provider.retrieve('test-key', 'test-ns');
      expect(retrieved).toBeDefined();
      expect(retrieved?.value).toBe('test-value');
    });

    it('should handle TTL', async () => {
      const provider = new InMemoryProvider();

      await provider.store({
        key: 'ttl-key',
        value: 'ttl-value',
        ttl: 1 // 1 second
      });

      // Should exist immediately
      let retrieved = await provider.retrieve('ttl-key');
      expect(retrieved).toBeDefined();

      // Wait for TTL to expire
      await new Promise(resolve => setTimeout(resolve, 1500));

      retrieved = await provider.retrieve('ttl-key');
      expect(retrieved).toBeNull();
    });
  });

  describe('ProviderManager', () => {
    it('should swap providers', async () => {
      const manager = getProviderManager();
      const provider1 = new InMemoryProvider();
      const provider2 = new InMemoryProvider();

      manager.registerProvider('provider1', provider1);
      manager.registerProvider('provider2', provider2);

      // Store data with provider1
      await provider1.store({ key: 'test', value: 'value1' });

      // Swap to provider2
      await manager.swapProvider('provider2');

      // Verify current provider is provider2
      expect(manager.getCurrentProvider()).toBe(provider2);
    });

    it('should get available providers', async () => {
      const manager = getProviderManager();
      const provider1 = new InMemoryProvider();
      const provider2 = new InMemoryProvider();

      manager.registerProvider('provider1', provider1);
      manager.registerProvider('provider2', provider2);

      const available = await manager.getAvailableProviders();
      expect(available).toContain('provider1');
      expect(available).toContain('provider2');
    });
  });

  describe('CachingMemoryService', () => {
    it('should cache reads', async () => {
      const provider = new InMemoryProvider();
      const service = new CachingMemoryService(provider, { maxSize: 100 });

      await service.store({ key: 'test', value: 'value' });

      // First read - from provider
      const first = await service.retrieve('test');
      expect(first).toBeDefined();

      // Second read - from cache
      const second = await service.retrieve('test');
      expect(second).toBeDefined();

      const stats = service.getCacheStats();
      expect(stats.size).toBeGreaterThan(0);
    });

    it('should invalidate cache', async () => {
      const provider = new InMemoryProvider();
      const service = new CachingMemoryService(provider);

      await service.store({ key: 'test', value: 'value1' });

      // Read to populate cache
      await service.retrieve('test');

      // Update provider directly
      await provider.store({ key: 'test', value: 'value2' });

      // Invalidate cache
      await service.invalidateCache('test');

      // Read should get new value
      const retrieved = await service.retrieve('test');
      expect(retrieved?.value).toBe('value2');
    });

    it('should warm cache', async () => {
      const provider = new InMemoryProvider();
      const service = new CachingMemoryService(provider);

      await provider.store({ key: 'key1', value: 'value1' });
      await provider.store({ key: 'key2', value: 'value2' });

      await service.warmCache([
        { key: 'key1' },
        { key: 'key2' }
      ]);

      const stats = service.getCacheStats();
      expect(stats.size).toBe(2);
    });
  });
});

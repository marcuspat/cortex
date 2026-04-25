/**
 * ADR-006: Unified Memory Service - Integration Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';

describe('ADR-006: Unified Memory Service', () => {
  it('should have memory provider interface', async () => {
    const { InMemoryProvider } = await import('../../../v3/@claude-flow/memory/providers/InMemoryProvider');

    const provider = new InMemoryProvider();
    expect(provider).toBeDefined();
  });

  it('should store and retrieve entries', async () => {
    const { InMemoryProvider } = await import('../../../v3/@claude-flow/memory/providers/InMemoryProvider');

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

  it('should have provider manager', async () => {
    const { ProviderManager, getProviderManager, resetProviderManager } = await import('../../../v3/@claude-flow/memory/ProviderManager');
    const { InMemoryProvider } = await import('../../../v3/@claude-flow/memory/providers/InMemoryProvider');

    resetProviderManager();

    const manager = getProviderManager();
    const provider = new InMemoryProvider();

    manager.registerProvider('test', provider);
    expect(manager.getProvider('test')).toBe(provider);
  });

  it('should have caching memory service', async () => {
    const { CachingMemoryService } = await import('../../../v3/@claude-flow/memory/CachingMemoryService');
    const { InMemoryProvider } = await import('../../../v3/@claude-flow/memory/providers/InMemoryProvider');

    const provider = new InMemoryProvider();
    const service = new CachingMemoryService(provider);

    await service.store({ key: 'test', value: 'value' });

    const retrieved = await service.retrieve('test');
    expect(retrieved?.value).toBe('value');

    const stats = service.getCacheStats();
    expect(stats.size).toBeGreaterThan(0);
  });
});

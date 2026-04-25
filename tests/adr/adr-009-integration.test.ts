/**
 * ADR-009: Hybrid Memory Backend - Integration Tests
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';

describe('ADR-009: Hybrid Memory Backend', () => {
  it('should have health monitor', async () => {
    const { HealthMonitor } = await import('../../../v3/@claude-flow/hybrid-memory/HealthMonitor');
    const { InMemoryBackend } = await import('../../../v3/@claude-flow/hybrid-memory/src/index');

    const monitor = new HealthMonitor();
    const backend = new InMemoryBackend();

    monitor.registerBackend('backend1', backend);

    await monitor.checkAllBackends();

    const status = monitor.getHealthStatus('backend1');
    expect(status).toBeDefined();
    expect(status?.healthy).toBe(true);
  });

  it('should have failover manager', async () => {
    const { FailoverManager } = await import('../../../v3/@claude-flow/hybrid-memory/FailoverManager');
    const { HealthMonitor } = await import('../../../v3/@claude-flow/hybrid-memory/HealthMonitor');
    const { InMemoryBackend } = await import('../../../v3/@claude-flow/hybrid-memory/src/index');

    const healthMonitor = new HealthMonitor();
    const backend1 = new InMemoryBackend();
    const backend2 = new InMemoryBackend();

    healthMonitor.registerBackend('backend1', backend1);
    healthMonitor.registerBackend('backend2', backend2);

    const failoverManager = new FailoverManager(healthMonitor, {
      primaryBackend: 'backend1',
      secondaryBackend: 'backend2',
      autoFailover: true,
      autoRecovery: true,
      writeThroughCache: true
    });

    expect(failoverManager.getCurrentPrimary()).toBe('backend1');
    expect(failoverManager.getCurrentSecondary()).toBe('backend2');
  });

  it('should have enhanced hybrid memory', async () => {
    const { EnhancedHybridMemory } = await import('../../../v3/@claude-flow/hybrid-memory/EnhancedHybridMemory');
    const { InMemoryBackend } = await import('../../../v3/@claude-flow/hybrid-memory/src/index');

    const backend1 = new InMemoryBackend();
    const backend2 = new InMemoryBackend();

    const hybridMemory = new EnhancedHybridMemory(backend1, backend2, {
      autoFailover: true,
      autoRecovery: true,
      writeThroughCache: true
    });

    await hybridMemory.set('test-key', 'test-value');
    const value = await hybridMemory.get('test-key');

    expect(value).toBe('test-value');

    const healthStatus = hybridMemory.getHealthStatus();
    expect(healthStatus.backends).toBeDefined();
    expect(healthStatus.failover).toBeDefined();

    await hybridMemory.shutdown();
  });
});

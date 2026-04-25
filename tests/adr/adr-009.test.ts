/**
 * ADR-009 Hybrid Memory Backend Tests
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { InMemoryBackend } from '@/v3/@claude-flow/hybrid-memory/src/index';
import { HealthMonitor } from '@/v3/@claude-flow/hybrid-memory/HealthMonitor';
import { FailoverManager } from '@/v3/@claude-flow/hybrid-memory/FailoverManager';
import { EnhancedHybridMemory } from '@/v3/@claude-flow/hybrid-memory/EnhancedHybridMemory';

describe('ADR-009: Hybrid Memory Backend', () => {
  describe('HealthMonitor', () => {
    let monitor: HealthMonitor;
    let backend1: InMemoryBackend;
    let backend2: InMemoryBackend;

    beforeEach(() => {
      monitor = new HealthMonitor();
      backend1 = new InMemoryBackend();
      backend2 = new InMemoryBackend();

      monitor.registerBackend('backend1', backend1);
      monitor.registerBackend('backend2', backend2);
    });

    afterEach(() => {
      monitor.stopMonitoring();
    });

    it('should check backend health', async () => {
      await monitor.checkAllBackends();

      const status1 = monitor.getHealthStatus('backend1');
      const status2 = monitor.getHealthStatus('backend2');

      expect(status1).toBeDefined();
      expect(status2).toBeDefined();
      expect(status1?.healthy).toBe(true);
      expect(status2?.healthy).toBe(true);
    });

    it('should identify unhealthy backends', async () => {
      // Create a failing backend
      const failingBackend = {
        async get() { throw new Error('Failed'); },
        async set() { throw new Error('Failed'); },
        async delete() { throw new Error('Failed'); },
        async clear() { throw new Error('Failed'); },
        async has() { throw new Error('Failed'); }
      };

      monitor.registerBackend('failing', failingBackend as any);
      await monitor.checkBackend('failing');

      const status = monitor.getHealthStatus('failing');
      expect(status?.healthy).toBe(false);
    });

    it('should get healthy and unhealthy backends', async () => {
      await monitor.checkAllBackends();

      const healthy = monitor.getHealthyBackends();
      const unhealthy = monitor.getUnhealthyBackends();

      expect(healthy).toContain('backend1');
      expect(healthy).toContain('backend2');
      expect(unhealthy).toHaveLength(0);
    });
  });

  describe('FailoverManager', () => {
    let healthMonitor: HealthMonitor;
    let failoverManager: FailoverManager;
    let backend1: InMemoryBackend;
    let backend2: InMemoryBackend;

    beforeEach(() => {
      healthMonitor = new HealthMonitor();
      backend1 = new InMemoryBackend();
      backend2 = new InMemoryBackend();

      healthMonitor.registerBackend('backend1', backend1);
      healthMonitor.registerBackend('backend2', backend2);

      failoverManager = new FailoverManager(healthMonitor, {
        primaryBackend: 'backend1',
        secondaryBackend: 'backend2',
        autoFailover: true,
        autoRecovery: true,
        writeThroughCache: true
      });
    });

    it('should get current primary and secondary', () => {
      expect(failoverManager.getCurrentPrimary()).toBe('backend1');
      expect(failoverManager.getCurrentSecondary()).toBe('backend2');
    });

    it('should get failover status', () => {
      const status = failoverManager.getFailoverStatus();

      expect(status.primary).toBe('backend1');
      expect(status.secondary).toBe('backend2');
      expect(status.autoFailoverEnabled).toBe(true);
      expect(status.autoRecoveryEnabled).toBe(true);
    });
  });

  describe('EnhancedHybridMemory', () => {
    let hybridMemory: EnhancedHybridMemory;
    let backend1: InMemoryBackend;
    let backend2: InMemoryBackend;

    beforeEach(() => {
      backend1 = new InMemoryBackend();
      backend2 = new InMemoryBackend();

      hybridMemory = new EnhancedHybridMemory(backend1, backend2, {
        autoFailover: true,
        autoRecovery: true,
        writeThroughCache: true
      });
    });

    afterEach(async () => {
      await hybridMemory.shutdown();
    });

    it('should store and retrieve from primary', async () => {
      await hybridMemory.set('test-key', 'test-value');
      const value = await hybridMemory.get('test-key');

      expect(value).toBe('test-value');
    });

    it('should replicate to secondary', async () => {
      await hybridMemory.set('test-key', 'test-value');

      // Wait for replication
      await new Promise(resolve => setTimeout(resolve, 100));

      const value1 = await backend1.get('test-key');
      const value2 = await backend2.get('test-key');

      expect(value1).toBe('test-value');
      expect(value2).toBe('test-value');
    });

    it('should get health status', () => {
      const status = hybridMemory.getHealthStatus();

      expect(status.backends).toBeDefined();
      expect(status.failover).toBeDefined();
      expect(status.backends.length).toBeGreaterThan(0);
    });
  });
});

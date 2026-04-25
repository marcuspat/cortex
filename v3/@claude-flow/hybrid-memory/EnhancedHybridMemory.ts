/**
 * Enhanced Hybrid Memory - ADR-009
 *
 * Hybrid memory with failover, health monitoring, and write-through caching
 */

import { MemoryBackend } from './src/index';
import { HealthMonitor } from './HealthMonitor';
import { FailoverManager, FailoverConfig } from './FailoverManager';

export class EnhancedHybridMemory implements MemoryBackend {
  private healthMonitor: HealthMonitor;
  private failoverManager: FailoverManager;
  private backends: Map<string, MemoryBackend> = new Map();

  constructor(
    primary: MemoryBackend,
    secondary: MemoryBackend,
    config: Partial<FailoverConfig> = {}
  ) {
    // Initialize health monitor
    this.healthMonitor = new HealthMonitor({
      interval: 30000, // 30 seconds
      timeout: 5000, // 5 seconds
      failureThreshold: 3,
      recoveryThreshold: 2
    });

    // Register backends
    this.backends.set('primary', primary);
    this.backends.set('secondary', secondary);
    this.healthMonitor.registerBackend('primary', primary);
    this.healthMonitor.registerBackend('secondary', secondary);

    // Initialize failover manager
    const failoverConfig: FailoverConfig = {
      primaryBackend: 'primary',
      secondaryBackend: 'secondary',
      autoFailover: config.autoFailover ?? true,
      autoRecovery: config.autoRecovery ?? true,
      writeThroughCache: config.writeThroughCache ?? true
    };

    this.failoverManager = new FailoverManager(this.healthMonitor, failoverConfig);

    // Start monitoring
    this.healthMonitor.startMonitoring();
  }

  async get(key: string): Promise<any> {
    const primary = this.getCurrentPrimary();

    if (!this.healthMonitor.isHealthy(primary)) {
      // Primary is unhealthy, try secondary
      const secondary = this.failoverManager.getCurrentSecondary();
      if (secondary && this.healthMonitor.isHealthy(secondary)) {
        return this.backends.get(secondary)!.get(key);
      }
      throw new Error('No healthy backends available');
    }

    try {
      return await this.backends.get(primary)!.get(key);
    } catch (error) {
      // Primary failed, try secondary
      const secondary = this.failoverManager.getCurrentSecondary();
      if (secondary && this.healthMonitor.isHealthy(secondary)) {
        try {
          const value = await this.backends.get(secondary)!.get(key);
          // Trigger failover
          await this.failoverManager.performFailover(primary, secondary);
          return value;
        } catch (secondaryError) {
          throw new Error('All backends failed');
        }
      }
      throw error;
    }
  }

  async set(key: string, value: any, ttl?: number): Promise<void> {
    const primary = this.getCurrentPrimary();
    const secondary = this.failoverManager.getCurrentSecondary();

    if (!this.healthMonitor.isHealthy(primary)) {
      // Primary is unhealthy, write to secondary only
      if (secondary && this.healthMonitor.isHealthy(secondary)) {
        return this.backends.get(secondary)!.set(key, value, ttl);
      }
      throw new Error('No healthy backends available');
    }

    try {
      // Write to primary
      await this.backends.get(primary)!.set(key, value, ttl);

      // Write-through to secondary if enabled and healthy
      if (secondary && this.healthMonitor.isHealthy(secondary)) {
        // Don't wait for secondary write
        this.backends.get(secondary)!.set(key, value, ttl).catch(error => {
          console.error('Write-through to secondary failed:', error);
        });
      }
    } catch (error) {
      // Primary failed, try secondary
      if (secondary && this.healthMonitor.isHealthy(secondary)) {
        try {
          await this.backends.get(secondary)!.set(key, value, ttl);
          // Trigger failover
          await this.failoverManager.performFailover(primary, secondary);
          return;
        } catch (secondaryError) {
          throw new Error('All backends failed');
        }
      }
      throw error;
    }
  }

  async delete(key: string): Promise<void> {
    const primary = this.getCurrentPrimary();
    const secondary = this.failoverManager.getCurrentSecondary();

    const operations = [];

    if (this.healthMonitor.isHealthy(primary)) {
      operations.push(this.backends.get(primary)!.delete(key));
    }

    if (secondary && this.healthMonitor.isHealthy(secondary)) {
      operations.push(this.backends.get(secondary)!.delete(key));
    }

    if (operations.length === 0) {
      throw new Error('No healthy backends available');
    }

    await Promise.all(operations);
  }

  async clear(): Promise<void> {
    const operations = [];

    for (const [name, backend] of this.backends.entries()) {
      if (this.healthMonitor.isHealthy(name)) {
        operations.push(backend.clear());
      }
    }

    if (operations.length === 0) {
      throw new Error('No healthy backends available');
    }

    await Promise.all(operations);
  }

  async has(key: string): Promise<boolean> {
    try {
      const value = await this.get(key);
      return value !== null;
    } catch {
      return false;
    }
  }

  private getCurrentPrimary(): string {
    return this.failoverManager.getCurrentPrimary();
  }

  getHealthStatus() {
    return {
      backends: this.healthMonitor.getAllHealthStatus(),
      failover: this.failoverManager.getFailoverStatus()
    };
  }

  async shutdown(): Promise<void> {
    this.healthMonitor.stopMonitoring();
  }
}

/**
 * Health Monitor - ADR-009
 *
 * Monitors backend health and triggers failover
 */

import { MemoryBackend } from './src/index';

export interface BackendHealth {
  backend: string;
  healthy: boolean;
  responseTime: number;
  lastCheck: Date;
  consecutiveFailures: number;
  errorRate: number;
}

export interface HealthCheckOptions {
  interval?: number;
  timeout?: number;
  failureThreshold?: number;
  recoveryThreshold?: number;
}

export class HealthMonitor {
  private backends: Map<string, MemoryBackend> = new Map();
  private healthStatus: Map<string, BackendHealth> = new Map();
  private checkInterval: NodeJS.Timeout | null = null;
  private failureThreshold: number;
  private recoveryThreshold: number;
  private onFailover?: (from: string, to: string) => Promise<void>;

  constructor(options: HealthCheckOptions = {}) {
    this.failureThreshold = options.failureThreshold || 3;
    this.recoveryThreshold = options.recoveryThreshold || 2;
  }

  registerBackend(name: string, backend: MemoryBackend): void {
    this.backends.set(name, backend);
    this.healthStatus.set(name, {
      backend: name,
      healthy: true,
      responseTime: 0,
      lastCheck: new Date(),
      consecutiveFailures: 0,
      errorRate: 0
    });
  }

  async startMonitoring(interval: number = 30000): Promise<void> {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
    }

    this.checkInterval = setInterval(async () => {
      await this.checkAllBackends();
    }, interval);

    // Initial check
    await this.checkAllBackends();
  }

  stopMonitoring(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
  }

  async checkAllBackends(): Promise<void> {
    const checks = Array.from(this.backends.keys()).map(name =>
      this.checkBackend(name)
    );
    await Promise.all(checks);
  }

  async checkBackend(name: string): Promise<BackendHealth> {
    const backend = this.backends.get(name);
    if (!backend) {
      throw new Error(`Backend not found: ${name}`);
    }

    const startTime = Date.now();
    let healthy = false;
    let responseTime = 0;

    try {
      // Perform a simple health check operation
      await backend.has('__health_check__');
      healthy = true;
      responseTime = Date.now() - startTime;
    } catch (error) {
      healthy = false;
      responseTime = Date.now() - startTime;
    }

    const currentStatus = this.healthStatus.get(name)!;
    const newStatus: BackendHealth = {
      backend: name,
      healthy,
      responseTime,
      lastCheck: new Date(),
      consecutiveFailures: healthy
        ? 0
        : currentStatus.consecutiveFailures + 1,
      errorRate: healthy
        ? currentStatus.errorRate * 0.9 // Decay on success
        : Math.min(1, currentStatus.errorRate + 0.1) // Increase on failure
    };

    this.healthStatus.set(name, newStatus);

    // Check if backend has failed
    if (!healthy && newStatus.consecutiveFailures >= this.failureThreshold) {
      await this.handleBackendFailure(name);
    }

    // Check if backend has recovered
    if (healthy && currentStatus.consecutiveFailures >= this.failureThreshold) {
      await this.handleBackendRecovery(name);
    }

    return newStatus;
  }

  getHealthStatus(name: string): BackendHealth | undefined {
    return this.healthStatus.get(name);
  }

  getAllHealthStatus(): BackendHealth[] {
    return Array.from(this.healthStatus.values());
  }

  getHealthyBackends(): string[] {
    return Array.from(this.healthStatus.values())
      .filter(status => status.healthy)
      .map(status => status.backend);
  }

  getUnhealthyBackends(): string[] {
    return Array.from(this.healthStatus.values())
      .filter(status => !status.healthy)
      .map(status => status.backend);
  }

  isHealthy(name: string): boolean {
    const status = this.healthStatus.get(name);
    return status?.healthy ?? false;
  }

  getResponseTime(name: string): number {
    const status = this.healthStatus.get(name);
    return status?.responseTime ?? 0;
  }

  setFailoverHandler(handler: (from: string, to: string) => Promise<void>): void {
    this.onFailover = handler;
  }

  private async handleBackendFailure(backendName: string): Promise<void> {
    console.warn(`Backend ${backendName} has failed, triggering failover`);

    const healthyBackends = this.getHealthyBackends();
    if (healthyBackends.length === 0) {
      console.error('No healthy backends available for failover');
      return;
    }

    // Select the healthiest backend (lowest response time)
    const targetBackend = healthyBackends.reduce((best, current) =>
      this.getResponseTime(current) < this.getResponseTime(best) ? current : best
    );

    if (this.onFailover) {
      await this.onFailover(backendName, targetBackend);
    }
  }

  private async handleBackendRecovery(backendName: string): Promise<void> {
    console.info(`Backend ${backendName} has recovered`);
    // Could trigger re-replication or other recovery actions
  }
}

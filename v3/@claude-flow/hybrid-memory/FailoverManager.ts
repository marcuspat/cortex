/**
 * Failover Manager - ADR-009
 *
 * Manages automatic failover between backends
 */

import { MemoryBackend } from './src/index';
import { HealthMonitor } from './HealthMonitor';

export interface FailoverConfig {
  primaryBackend: string;
  secondaryBackend: string;
  autoFailover: boolean;
  autoRecovery: boolean;
  writeThroughCache: boolean;
}

export class FailoverManager {
  private healthMonitor: HealthMonitor;
  private currentPrimary: string;
  private currentSecondary: string;
  private failoverConfig: FailoverConfig;
  private inFailover: boolean = false;

  constructor(
    healthMonitor: HealthMonitor,
    config: FailoverConfig
  ) {
    this.healthMonitor = healthMonitor;
    this.currentPrimary = config.primaryBackend;
    this.currentSecondary = config.secondaryBackend;
    this.failoverConfig = config;

    // Set up failover handler
    this.healthMonitor.setFailoverHandler(async (from, to) => {
      await this.performFailover(from, to);
    });
  }

  async performFailover(from: string, to: string): Promise<void> {
    if (this.inFailover) {
      console.warn('Failover already in progress, skipping');
      return;
    }

    this.inFailover = true;
    console.info(`Starting failover from ${from} to ${to}`);

    try {
      // Update primary/secondary assignments
      if (from === this.currentPrimary) {
        this.currentPrimary = to;
        // Find a new secondary from healthy backends
        const healthyBackends = this.healthMonitor.getHealthyBackends();
        const newSecondary = healthyBackends.find(b => b !== to);
        if (newSecondary) {
          this.currentSecondary = newSecondary;
        }
      }

      console.info(`Failover completed: new primary is ${this.currentPrimary}`);
    } catch (error) {
      console.error(`Failover failed:`, error);
      throw error;
    } finally {
      this.inFailover = false;
    }
  }

  getCurrentPrimary(): string {
    return this.currentPrimary;
  }

  getCurrentSecondary(): string {
    return this.currentSecondary;
  }

  async triggerManualFailover(to: string): Promise<void> {
    if (this.inFailover) {
      throw new Error('Failover already in progress');
    }

    await this.performFailover(this.currentPrimary, to);
  }

  async triggerRecovery(): Promise<void> {
    if (!this.failoverConfig.autoRecovery) {
      console.info('Auto-recovery disabled, skipping');
      return;
    }

    const unhealthyBackends = this.healthMonitor.getUnhealthyBackends();
    for (const backend of unhealthyBackends) {
      // Trigger health check to see if backend has recovered
      await this.healthMonitor.checkBackend(backend);
    }
  }

  getFailoverStatus(): {
    primary: string;
    secondary: string;
    inFailover: boolean;
    autoFailoverEnabled: boolean;
    autoRecoveryEnabled: boolean;
  } {
    return {
      primary: this.currentPrimary,
      secondary: this.currentSecondary,
      inFailover: this.inFailover,
      autoFailoverEnabled: this.failoverConfig.autoFailover,
      autoRecoveryEnabled: this.failoverConfig.autoRecovery
    };
  }
}

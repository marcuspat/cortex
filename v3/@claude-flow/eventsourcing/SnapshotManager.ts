/**
 * Snapshot Manager - ADR-007
 *
 * Manages aggregate snapshots for optimized replay
 */

import { Event } from './src/index';

export interface Snapshot {
  aggregateId: string;
  version: number;
  state: any;
  timestamp: Date;
  metadata?: Record<string, unknown>;
}

export interface SnapshotStore {
  save(snapshot: Snapshot): Promise<void>;
  get(aggregateId: string): Promise<Snapshot | null>;
  getLatest(aggregateId: string): Promise<Snapshot | null>;
  delete(aggregateId: string, version?: number): Promise<void>;
}

export class SnapshotManager {
  private snapshotStore: SnapshotStore;
  private snapshotThreshold: number; // Create snapshot every N events
  private snapshotInterval: number; // Create snapshot at least every N milliseconds

  constructor(
    snapshotStore: SnapshotStore,
    options: {
      snapshotThreshold?: number;
      snapshotInterval?: number;
    } = {}
  ) {
    this.snapshotStore = snapshotStore;
    this.snapshotThreshold = options.snapshotThreshold || 100;
    this.snapshotInterval = options.snapshotInterval || 3600000; // 1 hour
  }

  async shouldCreateSnapshot(
    aggregateId: string,
    currentVersion: number,
    lastSnapshotVersion?: number
  ): Promise<boolean> {
    // Create snapshot if threshold exceeded
    if (lastSnapshotVersion === undefined) {
      return currentVersion >= this.snapshotThreshold;
    }

    const eventsSinceSnapshot = currentVersion - lastSnapshotVersion;
    if (eventsSinceSnapshot >= this.snapshotThreshold) {
      return true;
    }

    // Check time-based interval
    if (lastSnapshotVersion !== undefined) {
      const lastSnapshot = await this.snapshotStore.getLatest(aggregateId);
      if (lastSnapshot) {
        const timeSinceSnapshot = Date.now() - lastSnapshot.timestamp.getTime();
        if (timeSinceSnapshot >= this.snapshotInterval) {
          return true;
        }
      }
    }

    return false;
  }

  async createSnapshot(
    aggregateId: string,
    version: number,
    state: any,
    metadata?: Record<string, unknown>
  ): Promise<Snapshot> {
    const snapshot: Snapshot = {
      aggregateId,
      version,
      state,
      timestamp: new Date(),
      metadata
    };

    await this.snapshotStore.save(snapshot);
    return snapshot;
  }

  async getLatestSnapshot(aggregateId: string): Promise<Snapshot | null> {
    return this.snapshotStore.getLatest(aggregateId);
  }

  async replayFromSnapshot(
    aggregateId: string,
    events: Event[],
    eventLoader: (fromVersion: number) => Promise<Event[]>
  ): Promise<{ state: any; version: number }> {
    // Get latest snapshot
    const snapshot = await this.getLatestSnapshot(aggregateId);

    if (!snapshot) {
      // No snapshot, replay from beginning
      let state = {};
      for (const event of events) {
        state = this.applyEvent(state, event);
      }
      return {
        state,
        version: events.length
      };
    }

    // Replay events from snapshot version
    const eventsSinceSnapshot = events.filter(e => e.version > snapshot.version);
    let state = snapshot.state;

    for (const event of eventsSinceSnapshot) {
      state = this.applyEvent(state, event);
    }

    return {
      state,
      version: eventsSinceSnapshot.length > 0
        ? eventsSinceSnapshot[eventsSinceSnapshot.length - 1].version
        : snapshot.version
    };
  }

  private applyEvent(state: any, event: Event): any {
    // Event application logic
    switch (event.type) {
      case 'AGENT_CREATED':
        return { ...state, id: event.data.id, name: event.data.name };
      case 'AGENT_UPDATED':
        return { ...state, ...event.data };
      case 'AGENT_DELETED':
        return { ...state, deleted: true };
      default:
        return state;
    }
  }

  async deleteSnapshots(aggregateId: string, beforeVersion?: number): Promise<void> {
    await this.snapshotStore.delete(aggregateId, beforeVersion);
  }

  async getSnapshotStats(): Promise<{ totalSnapshots: number; totalSize: number }> {
    // This would be implemented by the snapshot store
    return { totalSnapshots: 0, totalSize: 0 };
  }
}

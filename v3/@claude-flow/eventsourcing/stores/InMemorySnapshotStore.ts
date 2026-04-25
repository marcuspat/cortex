/**
 * In-Memory Snapshot Store - ADR-007
 *
 * In-memory implementation of snapshot storage
 */

import { Snapshot, SnapshotStore } from '../SnapshotManager';

export class InMemorySnapshotStore implements SnapshotStore {
  private snapshots: Map<string, Snapshot[]> = new Map();

  async save(snapshot: Snapshot): Promise<void> {
    const aggregateSnapshots = this.snapshots.get(snapshot.aggregateId) || [];
    aggregateSnapshots.push(snapshot);
    this.snapshots.set(snapshot.aggregateId, aggregateSnapshots);
  }

  async get(aggregateId: string): Promise<Snapshot | null> {
    const snapshots = this.snapshots.get(aggregateId);
    return snapshots?.[0] || null;
  }

  async getLatest(aggregateId: string): Promise<Snapshot | null> {
    const snapshots = this.snapshots.get(aggregateId);
    if (!snapshots || snapshots.length === 0) {
      return null;
    }

    // Return the snapshot with the highest version
    return snapshots.reduce((latest, current) =>
      current.version > latest.version ? current : latest
    );
  }

  async delete(aggregateId: string, version?: number): Promise<void> {
    if (version) {
      // Delete snapshots up to and including this version
      const snapshots = this.snapshots.get(aggregateId) || [];
      const filtered = snapshots.filter(s => s.version > version);
      this.snapshots.set(aggregateId, filtered);
    } else {
      // Delete all snapshots for this aggregate
      this.snapshots.delete(aggregateId);
    }
  }

  async getAllSnapshots(aggregateId: string): Promise<Snapshot[]> {
    return this.snapshots.get(aggregateId) || [];
  }

  async getSnapshotCount(aggregateId: string): Promise<number> {
    const snapshots = this.snapshots.get(aggregateId);
    return snapshots?.length || 0;
  }

  clear(): void {
    this.snapshots.clear();
  }
}

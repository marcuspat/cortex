/**
 * Event Replay Manager - ADR-007
 *
 * Handles event replay with snapshot support
 */

import { Event, EventStore } from './src/index';
import { SnapshotManager } from './SnapshotManager';

export interface ReplayOptions {
  fromSnapshot?: boolean;
  toVersion?: number;
  includeMetadata?: boolean;
}

export interface ReplayResult {
  state: any;
  version: number;
  eventsPlayed: number;
  snapshotUsed: boolean;
  duration: number;
}

export class EventReplayManager {
  constructor(
    private eventStore: EventStore,
    private snapshotManager: SnapshotManager
  ) {}

  async replay(
    aggregateId: string,
    options: ReplayOptions = {}
  ): Promise<ReplayResult> {
    const startTime = Date.now();
    let state = {};
    let eventsPlayed = 0;
    let snapshotUsed = false;
    let version = 0;

    if (options.fromSnapshot) {
      // Try to replay from snapshot
      const result = await this.replayFromSnapshot(aggregateId, options.toVersion);
      state = result.state;
      version = result.version;
      eventsPlayed = result.eventsPlayed;
      snapshotUsed = result.snapshotUsed;
    } else {
      // Full replay from beginning
      const events = await this.eventStore.getEvents(aggregateId);
      const eventsToPlay = options.toVersion
        ? events.filter(e => e.version <= options.toVersion!)
        : events;

      for (const event of eventsToPlay) {
        state = this.applyEvent(state, event);
        eventsPlayed++;
      }

      version = eventsToPlay.length > 0
        ? eventsToPlay[eventsToPlay.length - 1].version
        : 0;
    }

    const duration = Date.now() - startTime;

    return {
      state,
      version,
      eventsPlayed,
      snapshotUsed,
      duration
    };
  }

  async replayFromSnapshot(
    aggregateId: string,
    toVersion?: number
  ): Promise<{ state: any; version: number; eventsPlayed: number; snapshotUsed: boolean }> {
    const snapshot = await this.snapshotManager.getLatestSnapshot(aggregateId);

    if (!snapshot) {
      // No snapshot, fall back to full replay
      const events = await this.eventStore.getEvents(aggregateId);
      let state = {};
      for (const event of events) {
        state = this.applyEvent(state, event);
      }
      return {
        state,
        version: events.length,
        eventsPlayed: events.length,
        snapshotUsed: false
      };
    }

    // Get events after snapshot
    const events = await this.eventStore.getEventsFromVersion(
      aggregateId,
      snapshot.version + 1
    );

    const eventsToPlay = toVersion
      ? events.filter(e => e.version <= toVersion)
      : events;

    let state = snapshot.state;
    for (const event of eventsToPlay) {
      state = this.applyEvent(state, event);
    }

    return {
      state,
      version: eventsToPlay.length > 0
        ? eventsToPlay[eventsToPlay.length - 1].version
        : snapshot.version,
      eventsPlayed: eventsToPlay.length,
      snapshotUsed: true
    };
  }

  async reconstructState(
    aggregateId: string,
    targetVersion?: number
  ): Promise<any> {
    const result = await this.replay(aggregateId, {
      fromSnapshot: true,
      toVersion: targetVersion
    });
    return result.state;
  }

  async getEventHistory(
    aggregateId: string,
    fromVersion?: number,
    toVersion?: number
  ): Promise<Event[]> {
    const events = fromVersion
      ? await this.eventStore.getEventsFromVersion(aggregateId, fromVersion)
      : await this.eventStore.getEvents(aggregateId);

    return toVersion
      ? events.filter(e => e.version <= toVersion)
      : events;
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
}

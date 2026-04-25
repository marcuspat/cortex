/**
 * ADR-007: Event Sourcing - Integration Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';

describe('ADR-007: Event Sourcing for State', () => {
  it('should have event store', async () => {
    const { InMemoryEventStore, Event } = await import('../../../v3/@claude-flow/eventsourcing/src/index');

    const store = new InMemoryEventStore();

    const event: Event = {
      id: 'event-1',
      type: 'TEST_EVENT',
      aggregateId: 'aggregate-1',
      data: { test: 'data' },
      timestamp: new Date(),
      version: 1
    };

    await store.append(event);

    const events = await store.getEvents('aggregate-1');
    expect(events).toHaveLength(1);
    expect(events[0].type).toBe('TEST_EVENT');
  });

  it('should detect version conflicts', async () => {
    const { InMemoryEventStore, Event } = await import('../../../v3/@claude-flow/eventsourcing/src/index');

    const store = new InMemoryEventStore();

    const event1: Event = {
      id: 'event-1',
      type: 'TEST_EVENT',
      aggregateId: 'aggregate-1',
      data: { test: 'data' },
      timestamp: new Date(),
      version: 1
    };

    const event2: Event = {
      id: 'event-2',
      type: 'TEST_EVENT',
      aggregateId: 'aggregate-1',
      data: { test: 'data' },
      timestamp: new Date(),
      version: 3 // Wrong version
    };

    await store.append(event1);

    await expect(store.append(event2)).rejects.toThrow('Version conflict');
  });

  it('should have snapshot manager', async () => {
    const { SnapshotManager } = await import('../../../v3/@claude-flow/eventsourcing/SnapshotManager');
    const { InMemorySnapshotStore } = await import('../../../v3/@claude-flow/eventsourcing/stores/InMemorySnapshotStore');

    const snapshotStore = new InMemorySnapshotStore();
    const snapshotManager = new SnapshotManager(snapshotStore);

    const snapshot = await snapshotManager.createSnapshot(
      'aggregate-1',
      5,
      { state: 'data' }
    );

    expect(snapshot.aggregateId).toBe('aggregate-1');
    expect(snapshot.version).toBe(5);
    expect(snapshot.state).toEqual({ state: 'data' });
  });

  it('should have event replay manager', async () => {
    const { EventReplayManager } = await import('../../../v3/@claude-flow/eventsourcing/EventReplayManager');
    const { InMemoryEventStore } = await import('../../../v3/@claude-flow/eventsourcing/src/index');
    const { SnapshotManager } = await import('../../../v3/@claude-flow/eventsourcing/SnapshotManager');
    const { InMemorySnapshotStore } = await import('../../../v3/@claude-flow/eventsourcing/stores/InMemorySnapshotStore');

    const eventStore = new InMemoryEventStore();
    const snapshotStore = new InMemorySnapshotStore();
    const snapshotManager = new SnapshotManager(snapshotStore);
    const replayManager = new EventReplayManager(eventStore, snapshotManager);

    expect(replayManager).toBeDefined();
  });
});

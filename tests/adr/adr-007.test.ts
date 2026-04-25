/**
 * ADR-007: Event Sourcing - Tests
 */

import { describe, it, expect } from 'vitest';
import { InMemoryEventStore, EventSourcingAggregate } from '../../v3/@claude-flow/eventsourcing/src';

describe('ADR-007: Event Sourcing', () => {
  it('should create event store', () => {
    const store = new InMemoryEventStore();
    expect(store).toBeDefined();
  });

  it('should append and retrieve events', async () => {
    const store = new InMemoryEventStore();

    const event = {
      id: 'event-1',
      type: 'AGENT_CREATED',
      aggregateId: 'agent-1',
      data: { id: 'agent-1', name: 'Test Agent' },
      timestamp: new Date(),
      version: 1,
    };

    await store.append(event);

    const events = await store.getEvents('agent-1');
    expect(events).toHaveLength(1);
    expect(events[0].type).toBe('AGENT_CREATED');
  });

  it('should enforce version ordering', async () => {
    const store = new InMemoryEventStore();

    const event1 = {
      id: 'event-1',
      type: 'AGENT_CREATED',
      aggregateId: 'agent-1',
      data: { id: 'agent-1', name: 'Test' },
      timestamp: new Date(),
      version: 1,
    };

    const event2 = {
      id: 'event-2',
      type: 'AGENT_UPDATED',
      aggregateId: 'agent-1',
      data: { name: 'Updated' },
      timestamp: new Date(),
      version: 2,
    };

    await store.append(event1);
    await store.append(event2);

    const events = await store.getEvents('agent-1');
    expect(events).toHaveLength(2);
    expect(events[0].version).toBe(1);
    expect(events[1].version).toBe(2);
  });

  it('should reject duplicate versions', async () => {
    const store = new InMemoryEventStore();

    const event1 = {
      id: 'event-1',
      type: 'AGENT_CREATED',
      aggregateId: 'agent-1',
      data: { id: 'agent-1' },
      timestamp: new Date(),
      version: 1,
    };

    const event2 = {
      id: 'event-2',
      type: 'AGENT_UPDATED',
      aggregateId: 'agent-1',
      data: { name: 'Updated' },
      timestamp: new Date(),
      version: 1, // Duplicate version
    };

    await store.append(event1);

    await expect(store.append(event2)).rejects.toThrow();
  });

  it('should replay events to build state', async () => {
    const store = new InMemoryEventStore();

    await store.append({
      id: 'event-1',
      type: 'AGENT_CREATED',
      aggregateId: 'agent-1',
      data: { id: 'agent-1', name: 'Test' },
      timestamp: new Date(),
      version: 1,
    });

    await store.append({
      id: 'event-2',
      type: 'AGENT_UPDATED',
      aggregateId: 'agent-1',
      data: { name: 'Updated' },
      timestamp: new Date(),
      version: 2,
    });

    const state = await store.replay('agent-1');
    expect(state.name).toBe('Updated');
  });

  it('should create event sourcing aggregate', async () => {
    const store = new InMemoryEventStore();
    const aggregate = new EventSourcingAggregate(store, 'agent-1');

    await aggregate.initialize();
    expect(aggregate.getVersion()).toBe(0);
    expect(aggregate.getState()).toBeDefined();
  });
});

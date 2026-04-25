/**
 * ADR-007: Event Sourcing for State Management
 *
 * Event sourcing implementation for V3 state management
 */

export interface Event {
  id: string;
  type: string;
  aggregateId: string;
  data: any;
  timestamp: Date;
  version: number;
  metadata?: Record<string, any>;
}

export interface EventStore {
  append(event: Event): Promise<void>;
  getEvents(aggregateId: string): Promise<Event[]>;
  getEventsFromVersion(aggregateId: string, version: number): Promise<Event[]>;
  replay(aggregateId: string): Promise<any>;
}

export class InMemoryEventStore implements EventStore {
  private events: Map<string, Event[]> = new Map();

  async append(event: Event): Promise<void> {
    const aggregateEvents = this.events.get(event.aggregateId) || [];

    // Check version
    const lastVersion = aggregateEvents.length > 0
      ? aggregateEvents[aggregateEvents.length - 1].version
      : 0;

    if (event.version !== lastVersion + 1) {
      throw new Error(`Version conflict: expected ${lastVersion + 1}, got ${event.version}`);
    }

    aggregateEvents.push(event);
    this.events.set(event.aggregateId, aggregateEvents);
  }

  async getEvents(aggregateId: string): Promise<Event[]> {
    return this.events.get(aggregateId) || [];
  }

  async getEventsFromVersion(aggregateId: string, version: number): Promise<Event[]> {
    const events = this.events.get(aggregateId) || [];
    return events.filter(e => e.version >= version);
  }

  async replay(aggregateId: string): Promise<any> {
    const events = await this.getEvents(aggregateId);
    let state = {};

    for (const event of events) {
      state = this.applyEvent(state, event);
    }

    return state;
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

export class EventSourcingAggregate {
  private eventStore: EventStore;
  private aggregateId: string;
  private version: number = 0;
  private state: any = {};

  constructor(eventStore: EventStore, aggregateId: string) {
    this.eventStore = eventStore;
    this.aggregateId = aggregateId;
  }

  async initialize(): Promise<void> {
    this.state = await this.eventStore.replay(this.aggregateId);
    const events = await this.eventStore.getEvents(this.aggregateId);
    this.version = events.length;
  }

  protected async applyEvent(type: string, data: any): Promise<void> {
    const event: Event = {
      id: `${this.aggregateId}-${this.version + 1}`,
      type,
      aggregateId: this.aggregateId,
      data,
      timestamp: new Date(),
      version: this.version + 1,
    };

    await this.eventStore.append(event);
    this.version = event.version;
    this.state = this.applyEventToState(this.state, event);
  }

  private applyEventToState(state: any, event: Event): any {
    // Apply event to state
    return { ...state, ...event.data };
  }

  getState(): any {
    return this.state;
  }

  getVersion(): number {
    return this.version;
  }
}

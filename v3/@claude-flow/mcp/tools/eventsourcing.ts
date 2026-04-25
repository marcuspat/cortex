/**
 * MCP Event Sourcing Tools - ADR-005
 *
 * Tools for event sourcing operations
 */

import { Tool } from '@modelcontextprotocol/sdk/types.js';

export const eventsourcingTools: Tool[] = [
  {
    name: 'eventsourcing_append_event',
    description: 'Append an event to the event store',
    inputSchema: {
      type: 'object',
      properties: {
        aggregateId: {
          type: 'string',
          description: 'Aggregate identifier'
        },
        eventType: {
          type: 'string',
          description: 'Event type'
        },
        eventData: {
          type: 'object',
          description: 'Event data'
        },
        expectedVersion: {
          type: 'number',
          description: 'Expected version for optimistic locking'
        }
      },
      required: ['aggregateId', 'eventType', 'eventData']
    }
  },
  {
    name: 'eventsourcing_get_events',
    description: 'Get events for an aggregate',
    inputSchema: {
      type: 'object',
      properties: {
        aggregateId: {
          type: 'string',
          description: 'Aggregate identifier'
        },
        fromVersion: {
          type: 'number',
          description: 'Start from version'
        }
      },
      required: ['aggregateId']
    }
  },
  {
    name: 'eventsourcing_create_snapshot',
    description: 'Create a snapshot of aggregate state',
    inputSchema: {
      type: 'object',
      properties: {
        aggregateId: {
          type: 'string',
          description: 'Aggregate identifier'
        },
        state: {
          type: 'object',
          description: 'Current aggregate state'
        },
        version: {
          type: 'number',
          description: 'Current version'
        }
      },
      required: ['aggregateId', 'state', 'version']
    }
  },
  {
    name: 'eventsourcing_replay',
    description: 'Replay events from event store',
    inputSchema: {
      type: 'object',
      properties: {
        aggregateId: {
          type: 'string',
          description: 'Aggregate identifier'
        },
        fromSnapshot: {
          type: 'boolean',
          description: 'Start from latest snapshot'
        }
      },
      required: ['aggregateId']
    }
  }
];

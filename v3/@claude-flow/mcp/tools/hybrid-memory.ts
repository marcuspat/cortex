/**
 * MCP Hybrid Memory Tools - ADR-005
 *
 * Tools for hybrid memory backend operations
 */

import { Tool } from '@modelcontextprotocol/sdk/types.js';

export const hybridMemoryTools: Tool[] = [
  {
    name: 'hybrid_memory_store',
    description: 'Store data in hybrid memory backend with automatic backend selection',
    inputSchema: {
      type: 'object',
      properties: {
        key: {
          type: 'string',
          description: 'Storage key'
        },
        value: {
          type: 'string',
          description: 'Value to store'
        },
        namespace: {
          type: 'string',
          description: 'Namespace for organization'
        },
        preferredBackend: {
          type: 'string',
          description: 'Preferred backend',
          enum: ['auto', 'memory', 'filesystem', 'sqlite']
        },
        ttl: {
          type: 'number',
          description: 'Time-to-live in seconds'
        }
      },
      required: ['key', 'value']
    }
  },
  {
    name: 'hybrid_memory_retrieve',
    description: 'Retrieve data from hybrid memory backend with automatic failover',
    inputSchema: {
      type: 'object',
      properties: {
        key: {
          type: 'string',
          description: 'Storage key'
        },
        namespace: {
          type: 'string',
          description: 'Namespace for organization'
        }
      },
      required: ['key']
    }
  },
  {
    name: 'hybrid_memory_health_check',
    description: 'Check health of all memory backends',
    inputSchema: {
      type: 'object',
      properties: {
        detailed: {
          type: 'boolean',
          description: 'Include detailed health metrics'
        }
      }
    }
  },
  {
    name: 'hybrid_memory_failover',
    description: 'Trigger manual failover to backup backend',
    inputSchema: {
      type: 'object',
      properties: {
        targetBackend: {
          type: 'string',
          description: 'Target backend for failover',
          enum: ['memory', 'filesystem', 'sqlite']
        }
      },
      required: ['targetBackend']
    }
  }
];

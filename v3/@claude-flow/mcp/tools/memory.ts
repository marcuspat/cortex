/**
 * ADR-005: MCP Tools - Memory management
 */

export const memoryStoreTool = {
  name: 'memory_store',
  description: 'Store a value in memory with optional namespace',
  inputSchema: {
    type: 'object',
    properties: {
      key: { type: 'string', description: 'Memory key' },
      value: { type: 'string', description: 'Value to store (JSON stringified)' },
      namespace: { type: 'string', description: 'Namespace for organization' },
      tags: {
        type: 'array',
        items: { type: 'string' },
        description: 'Optional tags',
      },
      ttl: { type: 'number', description: 'Time-to-live in seconds' },
    },
    required: ['key', 'value'],
  },
};

export const memoryRetrieveTool = {
  name: 'memory_retrieve',
  description: 'Retrieve a value from memory',
  inputSchema: {
    type: 'object',
    properties: {
      key: { type: 'string', description: 'Memory key' },
      namespace: { type: 'string', description: 'Namespace' },
    },
    required: ['key'],
  },
};

export const memorySearchTool = {
  name: 'memory_search',
  description: 'Search memory by semantic similarity',
  inputSchema: {
    type: 'object',
    properties: {
      query: { type: 'string', description: 'Search query' },
      namespace: { type: 'string', description: 'Namespace to search' },
      limit: { type: 'number', description: 'Max results' },
      threshold: { type: 'number', description: 'Similarity threshold (0-1)' },
    },
    required: ['query'],
  },
};

export const memoryDeleteTool = {
  name: 'memory_delete',
  description: 'Delete a value from memory',
  inputSchema: {
    type: 'object',
    properties: {
      key: { type: 'string', description: 'Memory key' },
      namespace: { type: 'string', description: 'Namespace' },
    },
    required: ['key'],
  },
};

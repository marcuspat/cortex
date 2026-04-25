/**
 * ADR-005: MCP Tools - All available tools
 */

export * from './agent';
export * from './memory';

export const allTools = [
  // Agent tools
  {
    name: 'agent_create',
    description: 'Create a new agent with specified configuration',
  },
  {
    name: 'agent_list',
    description: 'List all active agents',
  },
  {
    name: 'agent_execute',
    description: 'Execute a task on an agent',
  },
  // Memory tools
  {
    name: 'memory_store',
    description: 'Store a value in memory',
  },
  {
    name: 'memory_retrieve',
    description: 'Retrieve a value from memory',
  },
  {
    name: 'memory_search',
    description: 'Search memory by semantic similarity',
  },
  {
    name: 'memory_delete',
    description: 'Delete a value from memory',
  },
];

export const toolCount = allTools.length;

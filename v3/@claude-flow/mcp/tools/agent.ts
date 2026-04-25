/**
 * ADR-005: MCP Tools - Agent management
 */

export const agentCreateTool = {
  name: 'agent_create',
  description: 'Create a new agent with specified configuration',
  inputSchema: {
    type: 'object',
    properties: {
      id: { type: 'string', description: 'Unique agent identifier' },
      name: { type: 'string', description: 'Agent display name' },
      type: { type: 'string', description: 'Agent type (coder, tester, reviewer, etc.)' },
      model: { type: 'string', description: 'Model to use (haiku, sonnet, opus)' },
      capabilities: {
        type: 'array',
        items: { type: 'string' },
        description: 'Agent capabilities',
      },
    },
    required: ['id', 'name', 'type'],
  },
};

export const agentListTool = {
  name: 'agent_list',
  description: 'List all active agents',
  inputSchema: {
    type: 'object',
    properties: {
      status: { type: 'string', description: 'Filter by status' },
    },
  },
};

export const agentExecuteTool = {
  name: 'agent_execute',
  description: 'Execute a task on an agent',
  inputSchema: {
    type: 'object',
    properties: {
      agentId: { type: 'string', description: 'Agent ID' },
      task: { type: 'string', description: 'Task description' },
    },
    required: ['agentId', 'task'],
  },
};

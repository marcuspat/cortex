/**
 * ADR-005: MCP JSON Schemas for validation
 */

export const agentConfigSchema = {
  $schema: 'http://json-schema.org/draft-07/schema#',
  title: 'AgentConfig',
  type: 'object',
  properties: {
    id: { type: 'string' },
    name: { type: 'string' },
    type: { type: 'string', enum: ['coder', 'tester', 'reviewer', 'architect'] },
    model: { type: 'string', enum: ['haiku', 'sonnet', 'opus'] },
    capabilities: { type: 'array', items: { type: 'string' } },
  },
  required: ['id', 'name', 'type'],
};

export const memoryEntrySchema = {
  $schema: 'http://json-schema.org/draft-07/schema#',
  title: 'MemoryEntry',
  type: 'object',
  properties: {
    key: { type: 'string' },
    value: { type: 'string' },
    namespace: { type: 'string' },
    tags: { type: 'array', items: { type: 'string' } },
    ttl: { type: 'number' },
  },
  required: ['key', 'value'],
};

export const taskExecutionSchema = {
  $schema: 'http://json-schema.org/draft-07/schema#',
  title: 'TaskExecution',
  type: 'object',
  properties: {
    agentId: { type: 'string' },
    task: { type: 'string' },
    options: {
      type: 'object',
      properties: {
        timeout: { type: 'number' },
        maxSteps: { type: 'number' },
      },
    },
  },
  required: ['agentId', 'task'],
};

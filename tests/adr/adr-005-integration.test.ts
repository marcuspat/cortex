/**
 * ADR-005: MCP-first API Design - Integration Tests
 */

import { describe, it, expect } from 'vitest';

describe('ADR-005: MCP-first API Design', () => {
  it('should have MCP schema validation', async () => {
    const { validateSchema, agentCreateSchema } = await import('../../../v3/@claude-flow/mcp/schemas/validation');

    const validRequest = {
      agentType: 'worker',
      agentId: 'test-agent-1',
      domain: 'testing',
      model: 'sonnet'
    };

    const result = validateSchema(agentCreateSchema, validRequest);
    expect(result.valid).toBe(true);
  });

  it('should reject invalid agent type', async () => {
    const { validateSchema, agentCreateSchema } = await import('../../../v3/@claude-flow/mcp/schemas/validation');

    const invalidRequest = {
      agentType: 'invalid-type'
    };

    const result = validateSchema(agentCreateSchema, invalidRequest);
    expect(result.valid).toBe(false);
    expect(result.errors).toBeDefined();
  });

  it('should have MCP error handling', async () => {
    const { AgentNotFoundError, MemoryKeyNotFoundError, ValidationError, MCPErrorCode } = await import('../../../v3/@claude-flow/mcp/errors');

    const agentError = new AgentNotFoundError('test-agent');
    expect(agentError.code).toBe(MCPErrorCode.AGENT_NOT_FOUND);
    expect(agentError.message).toContain('test-agent');

    const memoryError = new MemoryKeyNotFoundError('test-key', 'test-ns');
    expect(memoryError.code).toBe(MCPErrorCode.MEMORY_KEY_NOT_FOUND);

    const validationError = new ValidationError('agentType', 'Invalid type');
    expect(validationError.code).toBe(MCPErrorCode.VALIDATION_ERROR);
  });

  it('should have coordination tools', async () => {
    const { coordinationTools } = await import('../../../v3/@claude-flow/mcp/tools/coordination');

    expect(coordinationTools).toBeDefined();
    expect(coordinationTools.length).toBeGreaterThan(0);
    expect(coordinationTools[0].name).toBeDefined();
  });

  it('should have eventsourcing tools', async () => {
    const { eventsourcingTools } = await import('../../../v3/@claude-flow/mcp/tools/eventsourcing');

    expect(eventsourcingTools).toBeDefined();
    expect(eventsourcingTools.length).toBeGreaterThan(0);
  });

  it('should have hybrid memory tools', async () => {
    const { hybridMemoryTools } = await import('../../../v3/@claude-flow/mcp/tools/hybrid-memory');

    expect(hybridMemoryTools).toBeDefined();
    expect(hybridMemoryTools.length).toBeGreaterThan(0);
  });
});

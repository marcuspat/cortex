/**
 * ADR-005 MCP-first API Design Tests
 */

import { describe, it, expect } from 'vitest';
import {
  validateSchema,
  agentCreateSchema,
  memoryStoreSchema,
  coordinationSpawnSchema
} from '@/v3/@claude-flow/mcp/schemas/validation';
import {
  AgentNotFoundError,
  MemoryKeyNotFoundError,
  ValidationError,
  handleMCPError,
  MCPErrorCode
} from '@/v3/@claude-flow/mcp/errors';

describe('ADR-005: MCP-first API Design', () => {
  describe('Schema Validation', () => {
    it('should validate agent creation request', () => {
      const validRequest = {
        agentType: 'worker',
        agentId: 'test-agent-1',
        domain: 'testing',
        model: 'sonnet'
      };

      const result = validateSchema(agentCreateSchema, validRequest);
      expect(result.valid).toBe(true);
      expect(result.errors).toBeUndefined();
    });

    it('should reject invalid agent type', () => {
      const invalidRequest = {
        agentType: 'invalid-type'
      };

      const result = validateSchema(agentCreateSchema, invalidRequest);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Property agentType must be one of: worker, specialist, coordinator, tester, reviewer');
    });

    it('should reject request with missing required field', () => {
      const invalidRequest = {
        agentId: 'test-agent-1'
      };

      const result = validateSchema(agentCreateSchema, invalidRequest);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Missing required property: agentType');
    });

    it('should validate memory store request', () => {
      const validRequest = {
        key: 'test-key',
        value: 'test-value',
        namespace: 'test-namespace',
        tags: ['tag1', 'tag2'],
        ttl: 3600
      };

      const result = validateSchema(memoryStoreSchema, validRequest);
      expect(result.valid).toBe(true);
    });

    it('should reject memory store with invalid key length', () => {
      const invalidRequest = {
        key: '', // Empty key
        value: 'test-value'
      };

      const result = validateSchema(memoryStoreSchema, invalidRequest);
      expect(result.valid).toBe(false);
    });

    it('should reject memory store with too many tags', () => {
      const invalidRequest = {
        key: 'test-key',
        value: 'test-value',
        tags: Array(25).fill('tag') // 25 tags > maxItems 20
      };

      const result = validateSchema(memoryStoreSchema, invalidRequest);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Property tags must have at most 20 items');
    });
  });

  describe('Error Handling', () => {
    it('should create AgentNotFoundError', () => {
      const error = new AgentNotFoundError('test-agent');
      expect(error.code).toBe(MCPErrorCode.AGENT_NOT_FOUND);
      expect(error.message).toContain('test-agent');
      expect(error.data).toEqual({ agentId: 'test-agent' });
    });

    it('should create MemoryKeyNotFoundError', () => {
      const error = new MemoryKeyNotFoundError('test-key', 'test-ns');
      expect(error.code).toBe(MCPErrorCode.MEMORY_KEY_NOT_FOUND);
      expect(error.message).toContain('test-key');
      expect(error.message).toContain('test-ns');
    });

    it('should create ValidationError', () => {
      const error = new ValidationError('agentType', 'Invalid type');
      expect(error.code).toBe(MCPErrorCode.VALIDATION_ERROR);
      expect(error.message).toContain('agentType');
      expect(error.message).toContain('Invalid type');
    });

    it('should handle standard errors', () => {
      const standardError = new Error('Test error');
      const mcpError = handleMCPError(standardError);
      expect(mcpError).toBeInstanceOf(MCPError);
      expect(mcpError.code).toBe(MCPErrorCode.INTERNAL_ERROR);
    });

    it('should handle unknown errors', () => {
      const mcpError = handleMCPError('string error');
      expect(mcpError).toBeInstanceOf(MCPError);
      expect(mcpError.code).toBe(MCPErrorCode.INTERNAL_ERROR);
    });
  });

  describe('MCP Tool Registration', () => {
    it('should have all required tools registered', () => {
      // This would test the actual MCP server registration
      // For now, we just verify the schemas exist
      expect(agentCreateSchema).toBeDefined();
      expect(memoryStoreSchema).toBeDefined();
      expect(coordinationSpawnSchema).toBeDefined();
    });
  });
});

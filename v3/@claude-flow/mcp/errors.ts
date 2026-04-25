/**
 * MCP Error Handling - ADR-005
 *
 * Standardized error handling for MCP operations
 */

export enum MCPErrorCode {
  // Parse errors
  PARSE_ERROR = -32700,
  INVALID_REQUEST = -32600,

  // Request errors
  METHOD_NOT_FOUND = -32601,
  INVALID_PARAMS = -32602,
  INTERNAL_ERROR = -32603,

  // Custom errors
  AGENT_NOT_FOUND = -32001,
  AGENT_ALREADY_EXISTS = -32002,
  AGENT_OPERATION_FAILED = -32003,
  MEMORY_ERROR = -32004,
  MEMORY_KEY_NOT_FOUND = -32005,
  COORDINATION_ERROR = -32006,
  EVENT_SOURCING_ERROR = -32007,
  VALIDATION_ERROR = -32008,
  PERMISSION_DENIED = -32009,
  TIMEOUT = -32010,
  BACKEND_UNAVAILABLE = -32011
}

export class MCPError extends Error {
  constructor(
    public code: MCPErrorCode,
    message: string,
    public data?: unknown
  ) {
    super(message);
    this.name = 'MCPError';
  }

  toJSON() {
    return {
      code: this.code,
      message: this.message,
      data: this.data
    };
  }
}

export class AgentNotFoundError extends MCPError {
  constructor(agentId: string) {
    super(
      MCPErrorCode.AGENT_NOT_FOUND,
      `Agent not found: ${agentId}`,
      { agentId }
    );
    this.name = 'AgentNotFoundError';
  }
}

export class AgentAlreadyExistsError extends MCPError {
  constructor(agentId: string) {
    super(
      MCPErrorCode.AGENT_ALREADY_EXISTS,
      `Agent already exists: ${agentId}`,
      { agentId }
    );
    this.name = 'AgentAlreadyExistsError';
  }
}

export class MemoryKeyNotFoundError extends MCPError {
  constructor(key: string, namespace?: string) {
    super(
      MCPErrorCode.MEMORY_KEY_NOT_FOUND,
      `Memory key not found: ${key}${namespace ? ` (namespace: ${namespace})` : ''}`,
      { key, namespace }
    );
    this.name = 'MemoryKeyNotFoundError';
  }
}

export class ValidationError extends MCPError {
  constructor(field: string, message: string) {
    super(
      MCPErrorCode.VALIDATION_ERROR,
      `Validation failed for ${field}: ${message}`,
      { field, message }
    );
    this.name = 'ValidationError';
  }
}

export class PermissionDeniedError extends MCPError {
  constructor(resource: string, action: string) {
    super(
      MCPErrorCode.PERMISSION_DENIED,
      `Permission denied: ${action} on ${resource}`,
      { resource, action }
    );
    this.name = 'PermissionDeniedError';
  }
}

export class TimeoutError extends MCPError {
  constructor(operation: string, timeout: number) {
    super(
      MCPErrorCode.TIMEOUT,
      `Operation timeout: ${operation} exceeded ${timeout}ms`,
      { operation, timeout }
    );
    this.name = 'TimeoutError';
  }
}

export class BackendUnavailableError extends MCPError {
  constructor(backend: string) {
    super(
      MCPErrorCode.BACKEND_UNAVAILABLE,
      `Backend unavailable: ${backend}`,
      { backend }
    );
    this.name = 'BackendUnavailableError';
  }
}

// Error handler utility
export function handleMCPError(error: unknown): MCPError {
  if (error instanceof MCPError) {
    return error;
  }

  if (error instanceof Error) {
    // Map common errors to MCP errors
    if (error.message.includes('not found')) {
      return new MCPError(MCPErrorCode.INTERNAL_ERROR, error.message);
    }
    if (error.message.includes('timeout')) {
      return new TimeoutError('operation', 0);
    }
    if (error.message.includes('permission')) {
      return new PermissionDeniedError('resource', 'operation');
    }

    return new MCPError(MCPErrorCode.INTERNAL_ERROR, error.message);
  }

  return new MCPError(MCPErrorCode.INTERNAL_ERROR, 'Unknown error');
}

// Error response formatter
export function formatErrorResponse(error: MCPError): string {
  return JSON.stringify({
    jsonrpc: '2.0',
    error: error.toJSON(),
    id: null
  });
}

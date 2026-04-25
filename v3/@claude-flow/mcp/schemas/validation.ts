/**
 * MCP Schema Validation - ADR-005
 *
 * Complete JSON schema validation for all MCP tools
 */

import { JSONSchema7 } from 'json-schema';

export const agentCreateSchema: JSONSchema7 = {
  type: 'object',
  properties: {
    agentType: {
      type: 'string',
      enum: ['worker', 'specialist', 'coordinator', 'tester', 'reviewer'],
      description: 'Type of agent to spawn'
    },
    agentId: {
      type: 'string',
      minLength: 1,
      maxLength: 100,
      pattern: '^[a-zA-Z0-9_-]+$',
      description: 'Optional custom agent ID'
    },
    domain: {
      type: 'string',
      description: 'Agent domain specialization'
    },
    model: {
      type: 'string',
      enum: ['haiku', 'sonnet', 'opus', 'inherit'],
      description: 'Claude model to use'
    },
    task: {
      type: 'string',
      minLength: 1,
      description: 'Task description for intelligent model routing'
    }
  },
  required: ['agentType'],
  additionalProperties: false
};

export const memoryStoreSchema: JSONSchema7 = {
  type: 'object',
  properties: {
    key: {
      type: 'string',
      minLength: 1,
      maxLength: 255,
      description: 'Storage key'
    },
    value: {
      type: 'string',
      description: 'Value to store (will be JSON-stringified if object)'
    },
    namespace: {
      type: 'string',
      minLength: 1,
      maxLength: 100,
      pattern: '^[a-zA-Z0-9_-]+$',
      description: 'Namespace for organization'
    },
    tags: {
      type: 'array',
      items: {
        type: 'string',
        minLength: 1,
        maxLength: 50
      },
      maxItems: 20,
      description: 'Optional tags for filtering'
    },
    ttl: {
      type: 'number',
      minimum: 0,
      description: 'Time-to-live in seconds'
    }
  },
  required: ['key', 'value'],
  additionalProperties: false
};

export const memoryRetrieveSchema: JSONSchema7 = {
  type: 'object',
  properties: {
    key: {
      type: 'string',
      minLength: 1,
      description: 'Storage key'
    },
    namespace: {
      type: 'string',
      description: 'Namespace for organization'
    }
  },
  required: ['key'],
  additionalProperties: false
};

export const coordinationSpawnSchema: JSONSchema7 = {
  type: 'object',
  properties: {
    agentType: {
      type: 'string',
      enum: ['worker', 'specialist', 'coordinator', 'tester', 'reviewer']
    },
    agentId: {
      type: 'string',
      minLength: 1,
      maxLength: 100,
      pattern: '^[a-zA-Z0-9_-]+$'
    },
    domain: {
      type: 'string'
    },
    model: {
      type: 'string',
      enum: ['haiku', 'sonnet', 'opus', 'inherit']
    },
    task: {
      type: 'string',
      minLength: 1
    }
  },
  required: ['agentType'],
  additionalProperties: false
};

export const eventsourcingAppendSchema: JSONSchema7 = {
  type: 'object',
  properties: {
    aggregateId: {
      type: 'string',
      minLength: 1,
      description: 'Aggregate identifier'
    },
    eventType: {
      type: 'string',
      minLength: 1,
      description: 'Event type'
    },
    eventData: {
      type: 'object',
      description: 'Event data'
    },
    expectedVersion: {
      type: 'number',
      minimum: 0,
      description: 'Expected version for optimistic locking'
    }
  },
  required: ['aggregateId', 'eventType', 'eventData'],
  additionalProperties: false
};

export const hybridMemoryStoreSchema: JSONSchema7 = {
  type: 'object',
  properties: {
    key: {
      type: 'string',
      minLength: 1,
      maxLength: 255
    },
    value: {
      type: 'string'
    },
    namespace: {
      type: 'string',
      minLength: 1,
      maxLength: 100,
      pattern: '^[a-zA-Z0-9_-]+$'
    },
    preferredBackend: {
      type: 'string',
      enum: ['auto', 'memory', 'filesystem', 'sqlite']
    },
    ttl: {
      type: 'number',
      minimum: 0
    }
  },
  required: ['key', 'value'],
  additionalProperties: false
};

// Validation utility
export function validateSchema(schema: JSONSchema7, data: unknown): { valid: boolean; errors?: string[] } {
  const errors: string[] = [];

  // Basic type validation
  if (schema.type === 'object' && typeof data !== 'object') {
    return { valid: false, errors: ['Expected object'] };
  }

  if (typeof data !== 'object' || data === null) {
    return { valid: true };
  }

  const obj = data as Record<string, unknown>;

  // Check required properties
  if (schema.required) {
    for (const required of schema.required) {
      if (!(required in obj)) {
        errors.push(`Missing required property: ${required}`);
      }
    }
  }

  // Check properties
  if (schema.properties) {
    for (const [propName, propSchema] of Object.entries(schema.properties)) {
      if (propName in obj) {
        const value = obj[propName];
        const propDef = propSchema as JSONSchema7;

        // Type check
        if (propDef.type && typeof value !== propDef.type) {
          errors.push(`Property ${propName} must be ${propDef.type}`);
        }

        // Enum check
        if (propDef.enum && !propDef.enum.includes(value as any)) {
          errors.push(`Property ${propName} must be one of: ${propDef.enum.join(', ')}`);
        }

        // String constraints
        if (typeof value === 'string') {
          if (propDef.minLength && value.length < propDef.minLength) {
            errors.push(`Property ${propName} must be at least ${propDef.minLength} characters`);
          }
          if (propDef.maxLength && value.length > propDef.maxLength) {
            errors.push(`Property ${propName} must be at most ${propDef.maxLength} characters`);
          }
          if (propDef.pattern && !new RegExp(propDef.pattern).test(value)) {
            errors.push(`Property ${propName} does not match pattern: ${propDef.pattern}`);
          }
        }

        // Number constraints
        if (typeof value === 'number') {
          if (propDef.minimum !== undefined && value < propDef.minimum) {
            errors.push(`Property ${propName} must be at least ${propDef.minimum}`);
          }
          if (propDef.maximum !== undefined && value > propDef.maximum) {
            errors.push(`Property ${propName} must be at most ${propDef.maximum}`);
          }
        }

        // Array constraints
        if (propDef.type === 'array' && Array.isArray(value)) {
          if (propDef.maxItems && value.length > propDef.maxItems) {
            errors.push(`Property ${propName} must have at most ${propDef.maxItems} items`);
          }
        }
      }
    }
  }

  // Check for additional properties
  if (schema.additionalProperties === false) {
    const allowedProps = new Set(Object.keys(schema.properties || {}));
    for (const propName of Object.keys(obj)) {
      if (!allowedProps.has(propName)) {
        errors.push(`Unexpected property: ${propName}`);
      }
    }
  }

  return { valid: errors.length === 0, errors: errors.length > 0 ? errors : undefined };
}

/**
 * Enhanced MCP Server - ADR-005
 *
 * Complete MCP server with schema validation and error handling
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';

import { agentTools } from '../tools/agent';
import { memoryTools } from '../tools/memory';
import { coordinationTools } from '../tools/coordination';
import { eventsourcingTools } from '../tools/eventsourcing';
import { hybridMemoryTools } from '../tools/hybrid-memory';

import {
  validateSchema,
  agentCreateSchema,
  memoryStoreSchema,
  memoryRetrieveSchema,
  coordinationSpawnSchema,
  eventsourcingAppendSchema,
  hybridMemoryStoreSchema
} from '../schemas/validation';

import {
  handleMCPError,
  formatErrorResponse,
  MCPError
} from '../errors';

export class EnhancedMCPServer {
  private server: Server;
  private toolHandlers: Map<string, (args: any) => Promise<any>>;

  constructor() {
    this.server = new Server(
      {
        name: 'claude-flow',
        version: '3.0.0',
      },
      {
        capabilities: {
          tools: {},
          resources: {},
          prompts: {},
        },
      }
    );

    this.toolHandlers = new Map();
    this.setupHandlers();
  }

  private setupHandlers(): void {
    // List tools handler
    this.server.setRequestHandler(
      ListToolsRequestSchema,
      async () => ({
        tools: [
          ...agentTools,
          ...memoryTools,
          ...coordinationTools,
          ...eventsourcingTools,
          ...hybridMemoryTools
        ]
      })
    );

    // Call tool handler with validation
    this.server.setRequestHandler(
      CallToolRequestSchema,
      async (request) => {
        const { name, arguments: args } = request.params;

        try {
          // Validate arguments
          this.validateToolArguments(name, args);

          // Execute tool
          const handler = this.toolHandlers.get(name);
          if (!handler) {
            throw new Error(`Tool not found: ${name}`);
          }

          const result = await handler(args);
          return {
            content: [{
              type: 'text',
              text: JSON.stringify(result, null, 2)
            }]
          };
        } catch (error) {
          const mcpError = handleMCPError(error);
          return {
            content: [{
              type: 'text',
              text: formatErrorResponse(mcpError)
            }],
            isError: true
          };
        }
      }
    );
  }

  private validateToolArguments(toolName: string, args: any): void {
    let schema: any;

    switch (toolName) {
      case 'agent_create':
        schema = agentCreateSchema;
        break;
      case 'memory_store':
        schema = memoryStoreSchema;
        break;
      case 'memory_retrieve':
        schema = memoryRetrieveSchema;
        break;
      case 'coordination_agent_spawn':
        schema = coordinationSpawnSchema;
        break;
      case 'eventsourcing_append_event':
        schema = eventsourcingAppendSchema;
        break;
      case 'hybrid_memory_store':
        schema = hybridMemoryStoreSchema;
        break;
      default:
        // No validation for other tools yet
        return;
    }

    const validation = validateSchema(schema, args);
    if (!validation.valid) {
      throw new MCPError(
        -32602, // Invalid params
        `Validation failed for ${toolName}: ${validation.errors?.join(', ')}`,
        { errors: validation.errors }
      );
    }
  }

  registerToolHandler(name: string, handler: (args: any) => Promise<any>): void {
    this.toolHandlers.set(name, handler);
  }

  async start(): Promise<void> {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
  }

  async stop(): Promise<void> {
    await this.server.close();
  }
}

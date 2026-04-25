/**
 * ADR-005: MCP-first API design
 *
 * Main MCP server implementation
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';

export class ClaudeFlowMCPServer {
  private server: Server;

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

    this.setupTools();
  }

  private setupTools(): void {
    // Register tools
    this.server.setRequestHandler('tools/list', async () => ({
      tools: [
        {
          name: 'agent_create',
          description: 'Create a new agent',
          inputSchema: {
            type: 'object',
            properties: {
              name: { type: 'string' },
              type: { type: 'string' },
            },
            required: ['name', 'type'],
          },
        },
        {
          name: 'memory_store',
          description: 'Store a value in memory',
          inputSchema: {
            type: 'object',
            properties: {
              key: { type: 'string' },
              value: { type: 'string' },
              namespace: { type: 'string' },
            },
            required: ['key', 'value'],
          },
        },
        {
          name: 'memory_retrieve',
          description: 'Retrieve a value from memory',
          inputSchema: {
            type: 'object',
            properties: {
              key: { type: 'string' },
              namespace: { type: 'string' },
            },
            required: ['key'],
          },
        },
      ],
    }));
  }

  async start(): Promise<void> {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
  }

  async stop(): Promise<void> {
    await this.server.close();
  }
}

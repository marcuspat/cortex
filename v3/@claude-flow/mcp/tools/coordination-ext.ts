/**
 * ADR-005: MCP Tools - Extended coordination
 */

export const swarmInitTool = {
  name: 'swarm_init',
  description: 'Initialize a new swarm with specified topology',
  inputSchema: {
    type: 'object',
    properties: {
      topology: {
        type: 'string',
        enum: ['hierarchical', 'mesh', 'ring', 'star', 'hybrid'],
        description: 'Swarm topology type',
      },
      maxAgents: { type: 'number', description: 'Maximum number of agents' },
      strategy: { type: 'string', description: 'Agent strategy' },
    },
    required: ['topology'],
  },
};

export const swarmStatusTool = {
  name: 'swarm_status',
  description: 'Get current swarm status',
  inputSchema: {
    type: 'object',
    properties: {
      swarmId: { type: 'string', description: 'Swarm identifier' },
    },
  },
};

export const swarmShutdownTool = {
  name: 'swarm_shutdown',
  description: 'Shutdown a swarm',
  inputSchema: {
    type: 'object',
    properties: {
      swarmId: { type: 'string', description: 'Swarm identifier' },
      graceful: { type: 'boolean', description: 'Graceful shutdown' },
    },
    required: ['swarmId'],
  },
};

// Tool registration helper
export function registerCoordinationTools(register: (tool: any) => void) {
  register(swarmInitTool);
  register(swarmStatusTool);
  register(swarmShutdownTool);
}

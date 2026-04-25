/**
 * MCP Coordination Tools - ADR-005
 *
 * Tools for swarm coordination and agent management
 */

import { Tool } from '@modelcontextprotocol/sdk/types.js';

export const coordinationTools: Tool[] = [
  {
    name: 'coordination_agent_spawn',
    description: 'Spawn a new agent with intelligent model selection',
    inputSchema: {
      type: 'object',
      properties: {
        agentType: {
          type: 'string',
          description: 'Type of agent to spawn',
          enum: ['worker', 'specialist', 'coordinator', 'tester', 'reviewer']
        },
        agentId: {
          type: 'string',
          description: 'Optional custom agent ID'
        },
        domain: {
          type: 'string',
          description: 'Agent domain specialization'
        },
        model: {
          type: 'string',
          description: 'Claude model to use',
          enum: ['haiku', 'sonnet', 'opus', 'inherit']
        },
        task: {
          type: 'string',
          description: 'Task description for intelligent model routing'
        }
      },
      required: ['agentType']
    }
  },
  {
    name: 'coordination_agent_terminate',
    description: 'Terminate an agent',
    inputSchema: {
      type: 'object',
      properties: {
        agentId: {
          type: 'string',
          description: 'ID of agent to terminate'
        },
        force: {
          type: 'boolean',
          description: 'Force immediate termination'
        }
      },
      required: ['agentId']
    }
  },
  {
    name: 'coordination_agent_status',
    description: 'Get agent status',
    inputSchema: {
      type: 'object',
      properties: {
        agentId: {
          type: 'string',
          description: 'ID of agent'
        }
      },
      required: ['agentId']
    }
  },
  {
    name: 'coordination_swarm_init',
    description: 'Initialize a swarm with persistent state tracking',
    inputSchema: {
      type: 'object',
      properties: {
        topology: {
          type: 'string',
          description: 'Swarm topology type',
          enum: ['hierarchical', 'mesh', 'hierarchical-mesh', 'ring', 'star', 'hybrid', 'adaptive']
        },
        maxAgents: {
          type: 'number',
          description: 'Maximum number of agents (1-50)',
          minimum: 1,
          maximum: 50
        },
        strategy: {
          type: 'string',
          description: 'Agent strategy',
          enum: ['specialized', 'balanced', 'adaptive']
        }
      }
    }
  },
  {
    name: 'coordination_swarm_status',
    description: 'Get swarm status from persistent state',
    inputSchema: {
      type: 'object',
      properties: {
        swarmId: {
          type: 'string',
          description: 'Swarm ID (omit for most recent)'
        }
      }
    }
  }
];

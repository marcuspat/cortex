/**
 * ADR-001: agentic-flow as core foundation
 *
 * Example usage of agentic-flow for agent coordination
 */

import { Agent, Workflow, Coordinator } from 'agentic-flow';

/**
 * Create a new agent with agentic-flow
 */
export function createAgent(config: {
  id: string;
  name: string;
  model?: string;
  capabilities?: string[];
}) {
  return new Agent({
    id: config.id,
    name: config.name,
    model: config.model || 'claude-3-opus',
    capabilities: config.capabilities || [],
  });
}

/**
 * Create a workflow for agent execution
 */
export function createWorkflow(agent: Agent, config?: {
  maxSteps?: number;
  timeout?: number;
}) {
  return new Workflow({
    agent,
    maxSteps: config?.maxSteps || 100,
    timeout: config?.timeout || 300000,
  });
}

/**
 * Create a coordinator for multi-agent orchestration
 */
export function createCoordinator(config?: {
  strategy?: 'hierarchical' | 'flat' | 'consensus';
  maxAgents?: number;
}) {
  return new Coordinator({
    strategy: config?.strategy || 'hierarchical',
    maxAgents: config?.maxAgents || 10,
  });
}

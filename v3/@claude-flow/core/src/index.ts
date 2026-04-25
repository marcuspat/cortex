/**
 * ADR-001: agentic-flow as core foundation
 *
 * This module provides the core agentic-flow integration for Claude Flow V3.
 * It implements the foundation for all agent coordination and workflow management.
 *
 * @see ADR-001
 */

import { Agent, Workflow, Coordinator } from 'agentic-flow';

/**
 * Core agent factory using agentic-flow
 */
export class ClaudeFlowAgent {
  private agent: Agent;
  private workflow: Workflow;

  constructor(config: AgentConfig) {
    this.agent = new Agent({
      id: config.id,
      name: config.name,
      model: config.model || 'claude-3-opus',
      capabilities: config.capabilities || [],
    });

    this.workflow = new Workflow({
      agent: this.agent,
      maxSteps: config.maxSteps || 100,
      timeout: config.timeout || 300000,
    });
  }

  /**
   * Execute a task through agentic-flow
   */
  async execute(task: string): Promise<TaskResult> {
    return this.workflow.execute(task);
  }

  /**
   * Get agent status
   */
  getStatus(): AgentStatus {
    return {
      id: this.agent.id,
      name: this.agent.name,
      status: this.agent.status,
      completedTasks: this.agent.completedTasks,
    };
  }
}

/**
 * Agentic-flow coordinator for multi-agent orchestration
 */
export class AgenticFlowCoordinator {
  private coordinator: Coordinator;
  private agents: Map<string, ClaudeFlowAgent> = new Map();

  constructor(config: CoordinatorConfig) {
    this.coordinator = new Coordinator({
      strategy: config.strategy || 'hierarchical',
      maxAgents: config.maxAgents || 10,
    });
  }

  /**
   * Register an agent with the coordinator
   */
  registerAgent(agent: ClaudeFlowAgent): void {
    this.agents.set(agent.getStatus().id, agent);
    this.coordinator.addAgent(agent);
  }

  /**
   * Coordinate task execution across multiple agents
   */
  async coordinate(task: string, agents: string[]): Promise<TaskResult> {
    const selectedAgents = agents.map(id => this.agents.get(id)).filter(Boolean);
    return this.coordinator.coordinate(task, selectedAgents);
  }

  /**
   * Get coordinator status
   */
  getStatus(): CoordinatorStatus {
    return {
      activeAgents: this.agents.size,
      strategy: this.coordinator.strategy,
      completedTasks: this.coordinator.completedTasks,
    };
  }
}

// Type definitions
export interface AgentConfig {
  id: string;
  name: string;
  model?: string;
  capabilities?: string[];
  maxSteps?: number;
  timeout?: number;
}

export interface CoordinatorConfig {
  strategy?: 'hierarchical' | 'flat' | 'consensus';
  maxAgents?: number;
}

export interface TaskResult {
  success: boolean;
  result: any;
  error?: string;
  steps: number;
  duration: number;
}

export interface AgentStatus {
  id: string;
  name: string;
  status: string;
  completedTasks: number;
}

export interface CoordinatorStatus {
  activeAgents: number;
  strategy: string;
  completedTasks: number;
}

// Re-export agentic-flow types
export { Agent, Workflow, Coordinator };

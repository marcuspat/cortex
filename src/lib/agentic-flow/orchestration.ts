/**
 * ADR-001: agentic-flow orchestration patterns
 */

import { Agent, Workflow, Coordinator } from 'agentic-flow';

export class AgentOrchestrator {
  private coordinator: Coordinator;
  private agents: Map<string, Agent> = new Map();
  private workflows: Map<string, Workflow> = new Map();

  constructor(coordinator: Coordinator) {
    this.coordinator = coordinator;
  }

  registerAgent(agent: Agent): void {
    this.agents.set(agent.id, agent);
    this.coordinator.addAgent(agent);
  }

  createWorkflow(agentId: string, config?: { maxSteps?: number; timeout?: number }): Workflow {
    const agent = this.agents.get(agentId);
    if (!agent) {
      throw new Error(`Agent not found: ${agentId}`);
    }

    const workflow = new Workflow({
      agent,
      maxSteps: config?.maxSteps || 100,
      timeout: config?.timeout || 300000,
    });

    this.workflows.set(`${agentId}-workflow`, workflow);
    return workflow;
  }

  async coordinateTask(task: string, agentIds: string[]): Promise<any> {
    const agents = agentIds.map(id => this.agents.get(id)).filter(Boolean);
    return this.coordinator.coordinate(task, agents);
  }

  getAgent(agentId: string): Agent | undefined {
    return this.agents.get(agentId);
  }

  getWorkflow(agentId: string): Workflow | undefined {
    return this.workflows.get(`${agentId}-workflow`);
  }

  getAllAgents(): Agent[] {
    return Array.from(this.agents.values());
  }

  getActiveAgentCount(): number {
    return this.agents.size;
  }
}

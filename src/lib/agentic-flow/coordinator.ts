/**
 * ADR-001: Multi-agent coordination using agentic-flow
 */

import { Coordinator, Agent } from 'agentic-flow';

export class SwarmCoordinator {
  private coordinator: Coordinator;
  private agents: Map<string, Agent> = new Map();

  constructor() {
    this.coordinator = new Coordinator({
      strategy: 'hierarchical',
      maxAgents: 15,
    });
  }

  registerAgent(agent: Agent): void {
    this.agents.set(agent.id, agent);
    this.coordinator.addAgent(agent);
  }

  async coordinateTask(task: string, agentIds: string[]): Promise<any> {
    const agents = agentIds.map(id => this.agents.get(id)).filter(Boolean);
    return this.coordinator.coordinate(task, agents);
  }

  getStatus(): { activeAgents: number; strategy: string } {
    return {
      activeAgents: this.agents.size,
      strategy: this.coordinator.strategy,
    };
  }
}

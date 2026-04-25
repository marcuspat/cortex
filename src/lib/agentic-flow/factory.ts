/**
 * ADR-001: agentic-flow factory patterns
 */

import { Agent, Workflow, Coordinator } from 'agentic-flow';

export class AgentFactory {
  static createCoderAgent(id: string): Agent {
    return new Agent({
      id,
      name: `Coder-${id}`,
      model: 'claude-3-opus',
      capabilities: ['coding', 'testing', 'review'],
    });
  }

  static createTesterAgent(id: string): Agent {
    return new Agent({
      id,
      name: `Tester-${id}`,
      model: 'claude-3-sonnet',
      capabilities: ['testing', 'validation', 'coverage'],
    });
  }

  static createArchitectAgent(id: string): Agent {
    return new Agent({
      id,
      name: `Architect-${id}`,
      model: 'claude-3-opus',
      capabilities: ['architecture', 'design', 'planning'],
    });
  }
}

export class WorkflowFactory {
  static createQuickWorkflow(agent: Agent): Workflow {
    return new Workflow({
      agent,
      maxSteps: 10,
      timeout: 30000,
    });
  }

  static createStandardWorkflow(agent: Agent): Workflow {
    return new Workflow({
      agent,
      maxSteps: 50,
      timeout: 120000,
    });
  }

  static createDeepWorkflow(agent: Agent): Workflow {
    return new Workflow({
      agent,
      maxSteps: 200,
      timeout: 600000,
    });
  }
}

export class CoordinatorFactory {
  static createSwarmCoordinator(): Coordinator {
    return new Coordinator({
      strategy: 'hierarchical',
      maxAgents: 15,
    });
  }

  static createFlatCoordinator(): Coordinator {
    return new Coordinator({
      strategy: 'flat',
      maxAgents: 10,
    });
  }

  static createConsensusCoordinator(): Coordinator {
    return new Coordinator({
      strategy: 'consensus',
      maxAgents: 5,
    });
  }
}

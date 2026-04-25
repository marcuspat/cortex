/**
 * ADR-001: Workflow execution using agentic-flow
 */

import { Workflow, Agent } from 'agentic-flow';

export function executeAgentTask(
  agent: Agent,
  task: string,
  options?: { maxSteps?: number; timeout?: number }
): Promise<any> {
  const workflow = new Workflow({
    agent,
    maxSteps: options?.maxSteps || 100,
    timeout: options?.timeout || 300000,
  });

  return workflow.execute(task);
}

export function createAgentWorkflow(agent: Agent, config?: {
  maxSteps?: number;
  timeout?: number;
}): Workflow {
  return new Workflow({
    agent,
    maxSteps: config?.maxSteps || 100,
    timeout: config?.timeout || 300000,
  });
}

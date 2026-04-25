/**
 * ADR-001: agentic-flow task execution
 */

import { Agent, Workflow } from 'agentic-flow';

export class TaskExecutor {
  private workflow: Workflow;

  constructor(agent: Agent, options?: { maxSteps?: number; timeout?: number }) {
    this.workflow = new Workflow({
      agent,
      maxSteps: options?.maxSteps || 100,
      timeout: options?.timeout || 300000,
    });
  }

  async execute(task: string): Promise<any> {
    return this.workflow.execute(task);
  }

  async executeWithRetry(task: string, maxRetries: number = 3): Promise<any> {
    let lastError: Error | undefined;

    for (let i = 0; i < maxRetries; i++) {
      try {
        return await this.execute(task);
      } catch (error) {
        lastError = error as Error;
        await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
      }
    }

    throw lastError;
  }

  async executeParallel(tasks: string[]): Promise<any[]> {
    return Promise.all(tasks.map(task => this.execute(task)));
  }

  getWorkflow(): Workflow {
    return this.workflow;
  }
}

export function createExecutor(
  agent: Agent,
  options?: { maxSteps?: number; timeout?: number }
): TaskExecutor {
  return new TaskExecutor(agent, options);
}

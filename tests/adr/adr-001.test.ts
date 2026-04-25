/**
 * ADR-001: agentic-flow as core foundation - Tests
 */

import { describe, it, expect } from 'vitest';

describe('ADR-001: agentic-flow foundation', () => {
  it('should import agentic-flow dependencies', async () => {
    const pkg = await import('../../../package.json');
    expect(pkg.dependencies).toHaveProperty('agentic-flow');
  });

  it('should have agentic-flow imports in code', async () => {
    const agentModule = await import('../../src/lib/agentic-flow');
    expect(agentModule).toBeDefined();
    expect(agentModule.Agent).toBeDefined();
    expect(agentModule.Workflow).toBeDefined();
    expect(agentModule.Coordinator).toBeDefined();
  });

  it('should create agents from agentic-flow', async () => {
    const { createAgent } = await import('../../src/lib/agentic-flow');
    const agent = createAgent({
      id: 'test-agent',
      name: 'Test Agent',
      capabilities: ['test'],
    });
    expect(agent).toBeDefined();
  });

  it('should create workflows from agentic-flow', async () => {
    const { createWorkflow, Agent } = await import('../../src/lib/agentic-flow');
    const agent = new Agent({ id: 'test', name: 'Test' });
    const workflow = createWorkflow(agent);
    expect(workflow).toBeDefined();
  });

  it('should create coordinators from agentic-flow', async () => {
    const { createCoordinator } = await import('../../src/lib/agentic-flow');
    const coordinator = createCoordinator({
      strategy: 'hierarchical',
      maxAgents: 10,
    });
    expect(coordinator).toBeDefined();
  });
});

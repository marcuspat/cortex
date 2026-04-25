/**
 * ADR-002: Domain-Driven Design structure
 *
 * Coordination domain - Agent entity
 */

export interface Agent {
  id: string;
  name: string;
  type: string;
  status: 'idle' | 'busy' | 'error';
  capabilities: string[];
  createdAt: Date;
}

export interface AgentRepository {
  findById(id: string): Promise<Agent | null>;
  findAll(): Promise<Agent[]>;
  create(agent: Omit<Agent, 'id' | 'createdAt'>): Promise<Agent>;
  update(id: string, agent: Partial<Agent>): Promise<Agent>;
  delete(id: string): Promise<void>;
}

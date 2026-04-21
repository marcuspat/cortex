// ─── Connector Types ─────────────────────────────────────────────────────────

export type ConnectorType =
  | 'gmail'
  | 'github'
  | 'obsidian'
  | 'notion'
  | 'calendar'
  | 'drive'
  | 'slack'
  | 'filesystem';

export type ConnectorStatus = 'disconnected' | 'connecting' | 'active' | 'error';

export interface Connector {
  id: string;
  type: ConnectorType;
  name: string;
  status: ConnectorStatus;
  config: string;
  lastSync: string | null;
  itemCount: number;
  error: string | null;
  createdAt: string;
  updatedAt: string;
}

// ─── Memory Types ───────────────────────────────────────────────────────────

export type SourceType =
  | 'email'
  | 'code'
  | 'note'
  | 'document'
  | 'chat'
  | 'calendar'
  | 'bookmark';

export interface Memory {
  id: string;
  content: string;
  title: string;
  sourceType: SourceType;
  connectorId: string | null;
  chunkIndex: number;
  tags: string;
  metadata: string;
  accessCount: number;
  relevanceScore: number;
  sourceTimestamp: string;
  createdAt: string;
  updatedAt: string;
}

// ─── Insight Types ──────────────────────────────────────────────────────────

export type InsightType = 'connection' | 'reminder' | 'draft' | 'summary' | 'suggestion';
export type InsightStatus = 'pending' | 'surfaced' | 'acted' | 'dismissed' | 'expired';
export type InsightFeedback = 'useful' | 'not_useful' | 'already_knew' | null;

export interface InsightCard {
  id: string;
  title: string;
  claim: string;
  type: InsightType;
  status: InsightStatus;
  action: string | null;
  feedback: InsightFeedback;
  agentType: string;
  priority: number;
  memoryIds: string;
  expiresAt: string | null;
  createdAt: string;
  updatedAt: string;
}

// ─── Chat Types ─────────────────────────────────────────────────────────────

export interface ChatSession {
  id: string;
  title: string;
  messages?: ChatMessage[];
  createdAt: string;
  updatedAt: string;
}

export interface ChatMessage {
  id: string;
  sessionId: string;
  role: 'user' | 'assistant';
  content: string;
  memoryIds: string;
  createdAt: string;
}

// ─── Agent Types ────────────────────────────────────────────────────────────

export type AgentType = 'indexer' | 'researcher' | 'connector' | 'drafter' | 'planner' | 'orchestrator';

export interface AgentTrace {
  id: string;
  agentType: AgentType;
  status: 'running' | 'completed' | 'failed';
  input: string;
  output: string | null;
  memoryIds: string;
  error: string | null;
  durationMs: number;
  steps: string;
  createdAt: string;
}

export interface AgentStatus {
  type: AgentType;
  label: string;
  description: string;
  icon: string; // lucide icon name
  lastRun: string | null;
  runCount: number;
  successCount: number;
  failCount: number;
  avgDurationMs: number;
  status: 'idle' | 'running' | 'error';
}

// ─── Entity Types ───────────────────────────────────────────────────────────

export type EntityType = 'person' | 'project' | 'repository' | 'document' | 'organization';

export interface Entity {
  id: string;
  name: string;
  type: EntityType;
  canonicalName: string;
  aliases: string;
  metadata: string;
  createdAt: string;
  updatedAt: string;
}

// ─── Dashboard ──────────────────────────────────────────────────────────────

export interface DashboardStats {
  totalConnectors: number;
  activeConnectors: number;
  totalMemories: number;
  pendingInsights: number;
  totalInsights: number;
  recentTraces: AgentTrace[];
  recentInsights: InsightCard[];
  memoryBySource: { source: string; count: number }[];
  insightsByType: { type: string; count: number }[];
}

// ─── Settings ───────────────────────────────────────────────────────────────

export interface Setting {
  id: string;
  key: string;
  value: string;
}

// ─── Navigation ─────────────────────────────────────────────────────────────

export type NavView = 'dashboard' | 'connectors' | 'memory' | 'insights' | 'chat' | 'agents' | 'settings';

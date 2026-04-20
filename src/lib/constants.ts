import type { ConnectorType, AgentType, InsightType, SourceType } from './types';

// ─── Connector Metadata ─────────────────────────────────────────────────────

export const CONNECTOR_ICONS: Record<ConnectorType, string> = {
  gmail: 'Mail',
  github: 'Github',
  obsidian: 'FileText',
  notion: 'Database',
  calendar: 'Calendar',
  drive: 'HardDrive',
  slack: 'MessageSquare',
  filesystem: 'Folder',
};

export const CONNECTOR_DESCRIPTIONS: Record<ConnectorType, string> = {
  gmail: 'Sync emails, threads, and attachments from your Gmail inbox',
  github: 'Index repositories, issues, pull requests, and code changes',
  obsidian: 'Import notes, markdown files, and knowledge graphs',
  notion: 'Connect to Notion pages, databases, and workspace content',
  calendar: 'Import events, reminders, and scheduling data from Google Calendar',
  drive: 'Access and index files, folders, and shared documents',
  slack: 'Sync channels, messages, and shared files from Slack workspaces',
  filesystem: 'Watch and index local files, folders, and documents',
};

// ─── Agent Info ─────────────────────────────────────────────────────────────

export const AGENT_INFO: Array<{
  type: AgentType;
  label: string;
  description: string;
  icon: string;
}> = [
  {
    type: 'indexer',
    label: 'Indexer',
    description: 'Chunks, embeds, and stores incoming content into the memory index',
    icon: 'Database',
  },
  {
    type: 'researcher',
    label: 'Researcher',
    description: 'Explores memory for patterns, connections, and cross-references',
    icon: 'Search',
  },
  {
    type: 'connector',
    label: 'Connector',
    description: 'Manages data source integrations and sync pipelines',
    icon: 'Plug',
  },
  {
    type: 'drafter',
    label: 'Drafter',
    description: 'Composes drafts, summaries, and written artifacts from memory',
    icon: 'PenTool',
  },
  {
    type: 'planner',
    label: 'Planner',
    description: 'Schedules tasks, sets reminders, and organizes priorities',
    icon: 'CalendarClock',
  },
  {
    type: 'orchestrator',
    label: 'Orchestrator',
    description: 'Coordinates agents, routes tasks, and manages workflow execution',
    icon: 'Workflow',
  },
];

// ─── Insight Type Info ──────────────────────────────────────────────────────

export const INSIGHT_TYPE_INFO: Record<
  InsightType,
  { label: string; color: string; icon: string }
> = {
  connection: {
    label: 'Connection',
    color: 'text-emerald-600 bg-emerald-50',
    icon: 'Link',
  },
  reminder: {
    label: 'Reminder',
    color: 'text-amber-600 bg-amber-50',
    icon: 'Bell',
  },
  draft: {
    label: 'Draft',
    color: 'text-violet-600 bg-violet-50',
    icon: 'FileEdit',
  },
  summary: {
    label: 'Summary',
    color: 'text-sky-600 bg-sky-50',
    icon: 'FileBarChart',
  },
  suggestion: {
    label: 'Suggestion',
    color: 'text-rose-600 bg-rose-50',
    icon: 'Lightbulb',
  },
};

// ─── Source Type Info ───────────────────────────────────────────────────────

export const SOURCE_TYPE_INFO: Record<SourceType, { label: string; icon: string }> = {
  email: { label: 'Email', icon: 'Mail' },
  code: { label: 'Code', icon: 'Code' },
  note: { label: 'Note', icon: 'StickyNote' },
  document: { label: 'Document', icon: 'FileText' },
  chat: { label: 'Chat', icon: 'MessageSquare' },
  calendar: { label: 'Calendar', icon: 'Calendar' },
  bookmark: { label: 'Bookmark', icon: 'Bookmark' },
};

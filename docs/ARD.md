# Cortex MVP — Architecture Requirements Document (ARD)

## 1. Overview

Cortex is a personal second brain agent network. This document describes the architecture for the **MVP web dashboard** — a Next.js 16 application that demonstrates the core concepts of the Cortex system: multi-agent orchestration, semantic memory, proactive insight surfacing, and connector management.

The web dashboard serves as the **control plane and observation deck** for the Cortex system, providing real-time visibility into agents, memories, connectors, and insights.

## 2. Architecture Drivers

| Driver | Description |
|--------|-------------|
| **Privacy-first** | Local-first data storage, no external telemetry, all inference logged |
| **Proactive intelligence** | System surfaces insights without user prompting |
| **Multi-agent coordination** | Specialized agents (Indexer, Researcher, Connector, Drafter, Planner, Orchestrator) operate on shared memory |
| **Extensible connectors** | MCP-standard connectors for Gmail, GitHub, Obsidian, Notion, Calendar, Drive, Slack, Filesystem |
| **Traceability** | Every agent action and inference call is fully auditable |

## 3. System Architecture

### 3.1 High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Next.js 16 App Router                     │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐       │
│  │ Dashboard │ │Connectors│ │ Memory   │ │ Insights │       │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘       │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐                    │
│  │   Chat   │ │  Agents  │ │ Settings │                    │
│  └──────────┘ └──────────┘ └──────────┘                    │
├─────────────────────────────────────────────────────────────┤
│                    API Routes (REST)                         │
│  /api/connectors  /api/memories  /api/insights             │
│  /api/chat        /api/agents    /api/settings             │
│  /api/dashboard   /api/entities                        │
├─────────────────────────────────────────────────────────────┤
│              Prisma ORM + SQLite                            │
├─────────────────────────────────────────────────────────────┤
│              z-ai-web-dev-sdk (LLM/VLM)                     │
└─────────────────────────────────────────────────────────────┘
```

### 3.2 Layer Architecture

| Layer | Technology | Responsibility |
|-------|-----------|---------------|
| **Presentation** | React + TypeScript + shadcn/ui + Tailwind CSS 4 | UI components, responsive layout, dark/light theme |
| **State Management** | Zustand (client) + TanStack Query (server) | Client state, server state caching |
| **API** | Next.js API Routes | REST endpoints for CRUD + AI operations |
| **Data Access** | Prisma ORM | Type-safe database operations |
| **Database** | SQLite | Persistent storage for all domain data |
| **AI/ML** | z-ai-web-dev-sdk | LLM chat, VLM image understanding, embeddings |

## 4. Data Architecture

### 4.1 Entity Relationship Model

```
Connector (1) ──── (N) Memory
    │                    │
    │                    ├── Entity (resolved people, projects, repos)
    │                    │
    └── ConnectorSync

Memory (1) ──── (N) InsightCard (source memories)
Memory (1) ──── (N) ChatMessage (cited memories)
Memory (N) ──── (N) Entity (via MemoryEntity junction)

InsightCard (1) ──── (1) AgentTrace
AgentTrace (N) ──── (1) Agent (Indexer, Researcher, etc.)

ChatSession (1) ──── (N) ChatMessage
ChatMessage (N) ──── (N) Memory (citations)

Setting ── key-value system configuration
```

### 4.2 Core Data Models

| Model | Key Fields | Purpose |
|-------|-----------|---------|
| `Connector` | id, type, name, status, config, lastSync | MCP data source configurations |
| `Memory` | id, content, embedding, sourceType, connectorId, timestamps | Indexed knowledge chunks |
| `InsightCard` | id, claim, type, status, action, feedback, memories[] | Proactive insight units |
| `ChatSession` | id, title, createdAt | Conversation sessions |
| `ChatMessage` | id, sessionId, role, content, memories[] | Chat history with citations |
| `AgentTrace` | id, agentType, status, input, output, memories[], duration | Agent execution audit trail |
| `Entity` | id, name, type, canonicalName | Resolved cross-source entities |
| `Setting` | id, key, value | System configuration |

## 5. API Design

### 5.1 REST Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/dashboard` | Dashboard stats, recent activity, system health |
| GET | `/api/connectors` | List all connectors with status |
| POST | `/api/connectors` | Add a new connector |
| PUT | `/api/connectors/:id` | Update connector config |
| DELETE | `/api/connectors/:id` | Remove connector |
| POST | `/api/connectors/:id/sync` | Trigger manual sync |
| GET | `/api/memories` | Search/browse memories with filters |
| GET | `/api/memories/:id` | Get single memory with full details |
| DELETE | `/api/memories/:id` | Delete a memory |
| GET | `/api/insights` | List insight cards with filters |
| PATCH | `/api/insights/:id` | Update card (feedback, status) |
| GET | `/api/chat/sessions` | List chat sessions |
| POST | `/api/chat/sessions` | Create new session |
| POST | `/api/chat/sessions/:id/messages` | Send message and get AI response |
| GET | `/api/agents/traces` | List agent execution traces |
| GET | `/api/agents/traces/:id` | Get full trace detail |
| GET | `/api/agents/status` | Real-time agent status |
| GET | `/api/settings` | Get all settings |
| PUT | `/api/settings` | Update settings |
| GET | `/api/entities` | Search resolved entities |

### 5.2 AI Endpoints

| Endpoint | AI Skill Used | Purpose |
|----------|--------------|---------|
| `POST /api/chat/sessions/:id/messages` | LLM | Chat with knowledge base |
| `POST /api/insights/generate` | LLM | Generate proactive insights |
| `POST /api/memories/search/semantic` | LLM (embeddings) | Semantic search across memories |
| `POST /api/connectors/analyze` | VLM | Analyze uploaded connector data |

## 6. UI Architecture

### 6.1 Layout System

- **Shell**: Fixed sidebar (collapsible) + main content area
- **Responsive**: Sidebar collapses to icons on tablet, hamburger on mobile
- **Theme**: Dark mode primary, light mode supported via next-themes

### 6.2 Views

| View | Route | Description |
|------|-------|-------------|
| Dashboard | `/` | System overview, stats cards, recent insights, agent health, quick actions |
| Connectors | `/connectors` | Grid of connector cards with status indicators, sync controls, add/edit/delete |
| Memory | `/memory` | Search interface, filterable list, memory detail panel, entity graph |
| Insights | `/insights` | Feed of insight cards, filters by type/status, batch actions, feedback |
| Chat | `/chat` | Chat interface with citations, session management, memory references |
| Agents | `/agents` | Agent status grid, trace browser, execution timeline |
| Settings | `/settings` | System config, inference provider, privacy, retention policies |

### 6.3 Component Architecture

```
AppShell
├── Sidebar (collapsible navigation)
│   ├── NavItem × 7
│   └── SystemStatusBadge
├── MainContent (route-based)
│   ├── DashboardView
│   │   ├── StatsGrid (4 stat cards)
│   │   ├── RecentInsights (top 5)
│   │   ├── AgentHealth (6 agent cards)
│   │   └── QuickActions
│   ├── ConnectorsView
│   │   ├── ConnectorGrid
│   │   ├── AddConnectorDialog
│   │   └── SyncProgress
│   ├── MemoryView
│   │   ├── SearchBar
│   │   ├── MemoryList (filterable)
│   │   └── MemoryDetail (slide-over)
│   ├── InsightsView
│   │   ├── InsightFeed
│   │   ├── InsightCard (with feedback)
│   │   └── InsightFilters
│   ├── ChatView
│   │   ├── SessionList
│   │   ├── ChatArea
│   │   │   ├── MessageList
│   │   │   └── InputBar
│   │   └── CitationPanel
│   ├── AgentsView
│   │   ├── AgentStatusGrid
│   │   └── TraceBrowser
│   └── SettingsView
│       ├── InferenceConfig
│       ├── PrivacySettings
│       └── RetentionPolicy
└── Footer (sticky)
```

## 7. Non-Functional Requirements

| Attribute | Target |
|-----------|--------|
| **Page load** | < 2s first contentful paint |
| **API response** | < 500ms for CRUD, < 5s for AI queries |
| **Responsive** | Fully usable on mobile (320px) to desktop (1920px+) |
| **Accessibility** | WCAG 2.1 AA compliant |
| **Theme** | Dark mode primary, light mode toggle |
| **Database** | SQLite with < 50MB for MVP data set |
| **Bundle size** | < 500KB initial JS bundle |

## 8. Technology Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Framework | Next.js 16 App Router | Server components, API routes, file-based routing |
| Language | TypeScript | Type safety, developer experience |
| Styling | Tailwind CSS 4 + shadcn/ui | Rapid development, consistent design system |
| Database | SQLite via Prisma | Zero-ops, single-file, perfect for local-first |
| State | Zustand + TanStack Query | Lightweight client state + server cache |
| AI SDK | z-ai-web-dev-sdk | LLM/VLM integration in backend |
| Icons | Lucide React | Consistent icon set, tree-shakeable |
| Theme | next-themes | Dark/light mode with system preference |

## 9. Security Considerations

- All API routes validate input via Zod schemas
- No sensitive data stored in client-side state
- Connector OAuth tokens simulated (MVP); real implementation uses OS keychain
- Rate limiting on AI endpoints
- Content Security Policy headers
- CSRF protection on mutation endpoints

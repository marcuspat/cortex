# Cortex MVP — Domain-Driven Design (DDD) Document

## 1. Domain Overview

Cortex is a **personal intelligence system** that transforms fragmented digital knowledge into proactive, actionable insight through multi-agent orchestration and semantic memory.

### 1.1 Core Domain Statement

> A personal, always-learning intelligence layer that sits across a user's entire digital surface area — notes, email, code repositories, bookmarks, chat, calendar — and turns fragmented context into proactive, actionable insight.

## 2. Bounded Contexts

### 2.1 Context Map

```
                    ┌─────────────────────┐
                    │    User Interface    │
                    │   (Presentation)     │
                    └──────────┬──────────┘
                               │
          ┌────────────────────┼────────────────────┐
          │                    │                    │
   ┌──────▼──────┐    ┌───────▼───────┐   ┌───────▼───────┐
   │  Connector   │    │    Memory     │   │    Agent      │
   │  Management  │◄──►│    Index      │◄──►│ Orchestration │
   │              │    │               │   │               │
   └──────────────┘    └───────┬───────┘   └───────┬───────┘
                               │                    │
                        ┌──────▼──────┐    ┌───────▼───────┐
                        │   Insight    │    │    User      │
                        │   Engine     │    │ Interaction  │
                        │              │    │              │
                        └──────────────┘    └──────────────┘
```

## 3. Bounded Context Details

### 3.1 Connector Management

**Responsibility**: Manage data source connections, synchronize data, handle connector lifecycle.

| Element | Type | Description |
|---------|------|-------------|
| `Connector` | Aggregate Root | Represents a connected data source with config and sync state |
| `ConnectorType` | Value Object | Enum of supported sources (Gmail, GitHub, Obsidian, etc.) |
| `ConnectorStatus` | Value Object | Enum of lifecycle states (disconnected, connecting, active, error) |
| `SyncConfig` | Value Object | Sync schedule, rate limits, scope selection |
| `ConnectorAdded` | Domain Event | A new connector has been registered |
| `ConnectorSynced` | Domain Event | A sync cycle completed |
| `ConnectorRemoved` | Domain Event | A connector was deleted |

**Invariants**:
- A connector can only have one active sync at a time
- Connector deletion cascades to associated memories (with grace period)
- OAuth scopes are enforced per connector type

### 3.2 Memory Index

**Responsibility**: Store, retrieve, and manage the semantic memory graph.

| Element | Type | Description |
|---------|------|-------------|
| `Memory` | Aggregate Root | A single indexed knowledge chunk with embeddings and metadata |
| `MemoryContent` | Value Object | The actual text content, normalized and chunked |
| `MemoryMetadata` | Value Object | Source, timestamps, tags, connector reference |
| `Entity` | Entity | A resolved person, project, repo, or document across sources |
| `MemoryEntity` | Value Object | Junction linking memories to entities |
| `MemoryIndexed` | Domain Event | New memory written to the index |
| `MemoryDecayed` | Domain Event | Old memory summarized/compressed |
| `MemoryDeleted` | Domain Event | Memory removed (source deletion or user action) |

**Invariants**:
- Every memory must reference a source connector
- Entity resolution is idempotent — same identity always maps to same entity
- Memory deletion honors source deletion propagation
- Temporal ordering is preserved (source timestamp immutable)

### 3.3 Insight Engine

**Responsibility**: Generate, filter, rank, and deliver proactive insights.

| Element | Type | Description |
|---------|------|-------------|
| `InsightCard` | Aggregate Root | Atomic unit of proactive surfacing with claim, sources, action |
| `InsightType` | Value Object | Enum: Connection, Reminder, Draft, Summary, Suggestion |
| `InsightStatus` | Value Object | Enum: Pending, Surfaced, Acted, Dismissed, Expired |
| `InsightFeedback` | Value Object | User rating: useful, not_useful, already_knew |
| `InsightGenerated` | Domain Event | New insight produced by Connector agent |
| `InsightSurfaced` | Domain Event | Insight shown to user |
| `InsightActed` | Domain Event | User acted on insight suggestion |
| `InsightDismissed` | Domain Event | User dismissed insight |

**Invariants**:
- Every insight must cite at least one source memory
- Feedback is required before card dismissal (learning loop)
- Insight production respects quiet hours and rate limits
- Expired insights are auto-archived after configurable TTL

### 3.4 Agent Orchestration

**Responsibility**: Coordinate specialized agents, manage execution lifecycle, maintain traces.

| Element | Type | Description |
|---------|------|-------------|
| `AgentTrace` | Aggregate Root | Complete audit trail of a single agent execution |
| `AgentType` | Value Object | Enum: Indexer, Researcher, Connector, Drafter, Planner, Orchestrator |
| `TraceStep` | Value Object | Single step in agent execution (tool call, memory retrieval, inference) |
| `AgentConfig` | Value Object | Per-agent model selection, temperature, token limits |
| `AgentStarted` | Domain Event | Agent execution initiated |
| `AgentCompleted` | Domain Event | Agent execution finished (success or failure) |
| `AgentFailed` | Domain Event | Agent execution error |

**Invariants**:
- Every agent run produces a complete trace
- Traces are immutable once completed
- Orchestrator routing is deterministic (capability-based, not freeform)
- Agent failures are isolated — one failure does not cascade

### 3.5 User Interaction

**Responsibility**: Manage chat sessions, handle queries, coordinate responses with citations.

| Element | Type | Description |
|---------|------|-------------|
| `ChatSession` | Aggregate Root | A conversation session with context |
| `ChatMessage` | Entity | Single message (user or assistant) with content and metadata |
| `Citation` | Value Object | Reference to a memory used in a response |
| `SessionCreated` | Domain Event | New chat session started |
| `MessageSent` | Domain Event | User sent a message |
| `ResponseGenerated` | Domain Event | Assistant response created |

**Invariants**:
- Every assistant response must include source citations
- Sessions preserve full message history
- Citation references must be valid memory IDs

### 3.6 System Configuration

**Responsibility**: Manage system-wide settings, privacy policies, retention rules.

| Element | Type | Description |
|---------|------|-------------|
| `Setting` | Entity | Key-value system configuration |
| `InferenceConfig` | Value Object | LLM provider, model, API key, local/remote toggle |
| `PrivacyPolicy` | Value Object | Data retention, audit log retention, deletion scope |
| `QuietHours` | Value Object | Time range for suppressing proactive insights |

## 4. Aggregates Summary

```
┌──────────────────────────────────────────────────────────────┐
│                      AGGREGATES                              │
├──────────────────┬───────────────────────────────────────────┤
│ Connector        │ Manages data source lifecycle             │
│ Memory           │ Core knowledge unit with embeddings       │
│ InsightCard      │ Proactive insight with feedback loop      │
│ ChatSession      │ Conversation with citations               │
│ AgentTrace       │ Agent execution audit trail               │
│ Setting          │ System configuration                      │
│ Entity           │ Cross-source resolved identity            │
└──────────────────┴───────────────────────────────────────────┘
```

## 5. Domain Events

| Event | Producer | Consumer | Trigger |
|-------|----------|----------|---------|
| `ConnectorAdded` | Connector Management | Memory Index | New source registered |
| `ConnectorSynced` | Connector Management | Memory Index, Insight Engine | Sync completed |
| `ConnectorRemoved` | Connector Management | Memory Index | Source deleted |
| `MemoryIndexed` | Memory Index | Insight Engine, Agent Orchestration | New chunk stored |
| `MemoryDecayed` | Memory Index | Insight Engine | Old memory summarized |
| `MemoryDeleted` | Memory Index | Insight Engine | Source deletion |
| `InsightGenerated` | Insight Engine | User Interaction | Agent produces insight |
| `InsightActed` | User Interaction | Insight Engine | User takes action |
| `InsightDismissed` | User Interaction | Insight Engine | User rejects insight |
| `AgentStarted` | Agent Orchestration | System | Execution begins |
| `AgentCompleted` | Agent Orchestration | Insight Engine, Memory Index | Execution ends |
| `AgentFailed` | Agent Orchestration | System | Error occurred |

## 6. Ubiquitous Language

| Term | Definition |
|------|-----------|
| **Connector** | A standardized integration to an external data source via MCP |
| **Memory** | A single indexed, embedded chunk of knowledge with provenance |
| **Insight Card** | Atomic proactive surfacing unit with claim, sources, and optional action |
| **Trace** | Complete audit trail of a single agent execution |
| **Entity** | A canonical identity (person, project, repo) resolved across sources |
| **Session** | A chat conversation with full history and citation context |
| **Sync** | The process of pulling new/changed data from a connected source |
| **Decay** | Summarization of older, rarely-accessed memories to maintain signal quality |
| **Quiet Hours** | User-defined time range for suppressing proactive insight delivery |
| **Citation** | A reference linking an AI response to its source memory |

## 7. Context Integration Patterns

| Pattern | From → To | Description |
|---------|-----------|-------------|
| **Event Notification** | Connector → Memory | Connector sync produces memory index events |
| **Shared Kernel** | Memory ↔ Insight | Memory store is the shared data layer |
| **Anti-Corruption Layer** | Agent → Memory | Agents access memory through repository interface |
| **Customer-Supplier** | Insight → User | Insight engine produces, UI consumes |
| **Conformist** | Settings → All | All contexts read settings directly |

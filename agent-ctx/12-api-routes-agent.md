# Task 12 - API Routes Agent Worklog

## Task: Create all API routes for Cortex MVP

## Summary
Created 15 API route files covering all domain entities in the Cortex MVP. All routes use Next.js 16 App Router patterns with `NextRequest`/`NextResponse`, Prisma ORM for database access, proper error handling with try/catch, and standard REST conventions.

## Files Created

### 1. Dashboard (`src/app/api/dashboard/route.ts`)
- **GET**: Returns aggregated dashboard stats including connector counts (total/active), memory counts with sourceType distribution, insight card counts with type distribution, and the 5 most recent agent traces and insight cards.

### 2. Connectors (`src/app/api/connectors/route.ts`)
- **GET**: Lists all connectors ordered by creation date, with memory count per connector.
- **POST**: Creates a new connector (requires `type` and `name`, accepts `config` and `status`).

### 3. Connector by ID (`src/app/api/connectors/[id]/route.ts`)
- **GET**: Returns single connector with memory count.
- **PUT**: Updates connector fields (type, name, config, status, error).
- **DELETE**: Deletes a connector by ID.

### 4. Connector Sync (`src/app/api/connectors/[id]/sync/route.ts`)
- **POST**: Simulates a sync by updating `lastSync`, bumping `itemCount`, setting status to `active`, and creating randomized memory items from the connector's source type.

### 5. Memories List (`src/app/api/memories/route.ts`)
- **GET**: Lists memories with pagination and filters (`search`, `sourceType`, `connectorId`, `sortBy`, `sortOrder`, `limit`, `offset`). Includes related connector and entity info.

### 6. Memory by ID (`src/app/api/memories/[id]/route.ts`)
- **GET**: Returns single memory with connector and entity details. Increments accessCount on read.
- **DELETE**: Deletes a memory by ID.

### 7. Insights List (`src/app/api/insights/route.ts`)
- **GET**: Lists insight cards with filters (`type`, `status`, `sortBy`, `sortOrder`).

### 8. Insight by ID (`src/app/api/insights/[id]/route.ts`)
- **PATCH**: Updates insight card `feedback` and/or `status` fields.

### 9. Chat Sessions (`src/app/api/chat/sessions/route.ts`)
- **GET**: Lists all chat sessions with message count, ordered by last update.
- **POST**: Creates a new chat session.

### 10. Chat Session by ID (`src/app/api/chat/sessions/[id]/route.ts`)
- **GET**: Returns session with all messages ordered chronologically.

### 11. Chat Messages (`src/app/api/chat/sessions/[id]/messages/route.ts`)
- **POST**: Creates a user message, performs keyword-based memory search (with stop-word filtering), and generates an assistant response referencing found memories. Returns both messages and relevant memory IDs.

### 12. Agent Traces (`src/app/api/agents/traces/route.ts`)
- **GET**: Lists agent traces with pagination and filters (`agentType`, `status`).

### 13. Agent Status (`src/app/api/agents/status/route.ts`)
- **GET**: Returns status for all 6 agent types (indexer, researcher, connector, drafter, planner, orchestrator) including run counts, success/failure rates, avg duration, and last run info.

### 14. Entities (`src/app/api/entities/route.ts`)
- **GET**: Lists entities with optional search filter (searches name, canonicalName, and aliases). Includes memory count per entity.

### 15. Settings (`src/app/api/settings/route.ts`)
- **GET**: Returns all settings as a key-value map.
- **PUT**: Upserts settings from key-value pairs.

## Design Decisions
- Used `Promise.all` for parallel database queries to improve performance
- Chat message endpoint uses stop-word filtering for better keyword extraction
- Memory search is case-insensitive keyword matching (MVP approach, no embeddings)
- Connector sync simulates real behavior by creating actual memory records
- All dynamic route params use `Promise<{ id: string }>` pattern per Next.js 16
- Consistent error handling returns 400 for validation, 404 for not found, 500 for server errors

## Verification
- ESLint passes with zero errors
- Dev server compiles all routes successfully

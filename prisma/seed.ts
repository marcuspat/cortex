import { db } from '../src/lib/db';

async function seed() {
  console.log('Seeding database...');

  // Clear existing data
  await db.memoryEntity.deleteMany();
  await db.chatMessage.deleteMany();
  await db.chatSession.deleteMany();
  await db.entity.deleteMany();
  await db.agentTrace.deleteMany();
  await db.insightCard.deleteMany();
  await db.memory.deleteMany();
  await db.connector.deleteMany();
  await db.setting.deleteMany();

  // Settings
  await db.setting.createMany({
    data: [
      { key: 'inference_provider', value: 'claude' },
      { key: 'inference_model', value: 'claude-sonnet-4-20250514' },
      { key: 'local_inference', value: 'false' },
      { key: 'quiet_hours_start', value: '22:00' },
      { key: 'quiet_hours_end', value: '08:00' },
      { key: 'insight_rate_limit', value: '10' },
      { key: 'memory_retention_days', value: '365' },
      { key: 'auto_decay', value: 'true' },
      { key: 'theme', value: 'dark' },
    ]
  });

  // Connectors
  const connectors = await db.connector.createMany({
    data: [
      { type: 'gmail', name: 'Gmail', status: 'active', config: JSON.stringify({ email: 'user@gmail.com', scopes: ['read', 'modify'] }), lastSync: new Date(Date.now() - 1000 * 60 * 15), itemCount: 2847, error: null },
      { type: 'github', name: 'GitHub', status: 'active', config: JSON.stringify({ username: 'devuser', repos: ['cortex', 'side-project'] }), lastSync: new Date(Date.now() - 1000 * 60 * 5), itemCount: 1523, error: null },
      { type: 'obsidian', name: 'Obsidian Vault', status: 'active', config: JSON.stringify({ vaultPath: '/Users/dev/notes', autoSync: true }), lastSync: new Date(Date.now() - 1000 * 60 * 30), itemCount: 412, error: null },
      { type: 'notion', name: 'Notion', status: 'active', config: JSON.stringify({ workspace: 'Personal', databases: ['Tasks', 'Projects', 'Meeting Notes'] }), lastSync: new Date(Date.now() - 1000 * 60 * 60), itemCount: 289, error: null },
      { type: 'calendar', name: 'Google Calendar', status: 'active', config: JSON.stringify({ calendars: ['primary', 'work'] }), lastSync: new Date(Date.now() - 1000 * 60 * 2), itemCount: 156, error: null },
      { type: 'drive', name: 'Google Drive', status: 'connecting', config: JSON.stringify({ folders: ['/Documents', '/Work'] }), lastSync: null, itemCount: 0, error: null },
      { type: 'slack', name: 'Slack', status: 'disconnected', config: JSON.stringify({}), lastSync: null, itemCount: 0, error: null },
      { type: 'filesystem', name: 'Local Files', status: 'error', config: JSON.stringify({ path: '/Users/dev/Documents' }), lastSync: new Date(Date.now() - 1000 * 60 * 60 * 24), itemCount: 78, error: 'Permission denied: /Users/dev/Documents/private' },
    ]
  });

  // Entities
  const entities = await db.entity.createMany({
    data: [
      { name: 'Sarah Chen', type: 'person', canonicalName: 'Sarah Chen', aliases: JSON.stringify(['sarah.chen', 'sarahc', 'Sarah']) },
      { name: 'Marcus Webb', type: 'person', canonicalName: 'Marcus Webb', aliases: JSON.stringify(['mwebb', 'marcus']) },
      { name: 'Cortex', type: 'project', canonicalName: 'cortex', aliases: JSON.stringify(['cortex-core', 'cortex-app']) },
      { name: 'Q4 Planning', type: 'project', canonicalName: 'Q4 Planning 2026', aliases: JSON.stringify(['q4-plan', 'quarterly-planning']) },
      { name: 'github.com/devuser/cortex', type: 'repository', canonicalName: 'devuser/cortex', aliases: JSON.stringify(['cortex-repo']) },
      { name: 'Acme Corp', type: 'organization', canonicalName: 'Acme Corporation', aliases: JSON.stringify(['acme', 'Acme Corp']) },
    ]
  });

  // Memories
  const gmailConn = await db.connector.findFirst({ where: { type: 'gmail' } });
  const githubConn = await db.connector.findFirst({ where: { type: 'github' } });
  const obsidianConn = await db.connector.findFirst({ where: { type: 'obsidian' } });
  const notionConn = await db.connector.findFirst({ where: { type: 'notion' } });
  const calendarConn = await db.connector.findFirst({ where: { type: 'calendar' } });

  const memories = [
    {
      content: "Sarah Chen confirmed the API design review is scheduled for Thursday at 2pm. She mentioned the team should prepare documentation for the new authentication flow. The review will cover OAuth 2.0 implementation, token refresh mechanism, and rate limiting strategies. Marcus will present the backend architecture.",
      title: "API Design Review Scheduled",
      sourceType: "email",
      connectorId: gmailConn?.id,
      tags: JSON.stringify(["meeting", "api-design", "authentication", "sarah-chen", "marcus-webb"]),
      metadata: JSON.stringify({ from: "sarah.chen@acme.com", subject: "API Design Review - Thursday", threadId: "thread-001" }),
      accessCount: 12,
      relevanceScore: 0.92,
      sourceTimestamp: new Date(Date.now() - 1000 * 60 * 60 * 2),
    },
    {
      content: "Implemented the new embedding pipeline using LanceDB for vector storage. The pipeline supports batch embedding of documents up to 10,000 chunks with automatic batching. Average embedding time is 45ms per chunk using the BGE-large model. Memory usage stays under 500MB during batch operations.",
      title: "Embedding Pipeline Implementation",
      sourceType: "code",
      connectorId: githubConn?.id,
      tags: JSON.stringify(["embedding", "lancedb", "pipeline", "implementation"]),
      metadata: JSON.stringify({ repo: "devuser/cortex", commit: "a3f2b1c", file: "src/memory/embedding.rs" }),
      accessCount: 28,
      relevanceScore: 0.87,
      sourceTimestamp: new Date(Date.now() - 1000 * 60 * 60 * 5),
    },
    {
      content: "Architecture decision: We'll use a hybrid retrieval strategy combining dense embeddings with BM25 keyword search. Reranking will use a cross-encoder model for the top 50 candidates. This approach gives us 94% recall on our test set compared to 78% for embeddings alone.",
      title: "Hybrid Retrieval Architecture Decision",
      sourceType: "note",
      connectorId: obsidianConn?.id,
      tags: JSON.stringify(["architecture", "retrieval", "decision", "hybrid-search", "bm25"]),
      metadata: JSON.stringify({ notePath: "Architecture/Retrieval.md", folder: "Architecture" }),
      accessCount: 35,
      relevanceScore: 0.95,
      sourceTimestamp: new Date(Date.now() - 1000 * 60 * 60 * 24),
    },
    {
      content: "Customer feedback from Acme Corp pilot: They love the proactive insight cards but want more control over notification frequency. The weekly digest feature was the most requested addition. Sarah Chen from Acme is our main contact and has been providing excellent feedback. They're willing to be a reference customer.",
      title: "Acme Corp Pilot Feedback",
      sourceType: "document",
      connectorId: notionConn?.id,
      tags: JSON.stringify(["feedback", "acme-corp", "pilot", "insight-cards", "customer"]),
      metadata: JSON.stringify({ pageId: "page-001", database: "Meeting Notes" }),
      accessCount: 8,
      relevanceScore: 0.78,
      sourceTimestamp: new Date(Date.now() - 1000 * 60 * 60 * 48),
    },
    {
      content: "Sprint retrospective notes: The team agreed that connector development should follow a standard pattern. Each connector needs: initial backfill, incremental sync, deletion propagation, and rate-limit-aware retry. The GitHub connector is the reference implementation. Average connector development time is 2-3 days.",
      title: "Sprint Retrospective - Connector Patterns",
      sourceType: "note",
      connectorId: obsidianConn?.id,
      tags: JSON.stringify(["sprint", "retrospective", "connectors", "patterns"]),
      metadata: JSON.stringify({ notePath: "Sprints/Retro-2026-04-15.md" }),
      accessCount: 5,
      relevanceScore: 0.72,
      sourceTimestamp: new Date(Date.now() - 1000 * 60 * 60 * 72),
    },
    {
      content: "Marcus Webb submitted PR #142 for the Drafter agent improvements. The PR adds template-based draft generation with user preference learning. It includes support for email drafts, summary generation, and document outlines. Review requested by end of week.",
      title: "PR #142 - Drafter Agent Improvements",
      sourceType: "code",
      connectorId: githubConn?.id,
      tags: JSON.stringify(["pr", "drafter", "agent", "marcus-webb", "templates"]),
      metadata: JSON.stringify({ repo: "devuser/cortex", pr: 142, author: "mwebb" }),
      accessCount: 15,
      relevanceScore: 0.83,
      sourceTimestamp: new Date(Date.now() - 1000 * 60 * 60 * 8),
    },
    {
      content: "Performance benchmarks show that the new retrieval pipeline achieves median 120ms query latency over 100k memories. This is 20% faster than our target of 150ms. Cold start of the daemon is 180ms, well under the 300ms target. Memory usage peaks at 220MB during heavy indexing.",
      title: "Performance Benchmark Results",
      sourceType: "note",
      connectorId: obsidianConn?.id,
      tags: JSON.stringify(["performance", "benchmarks", "retrieval", "latency"]),
      metadata: JSON.stringify({ notePath: "Engineering/Benchmarks-2026-04.md" }),
      accessCount: 22,
      relevanceScore: 0.89,
      sourceTimestamp: new Date(Date.now() - 1000 * 60 * 60 * 36),
    },
    {
      content: "Meeting with Sarah Chen about Q4 planning. Key decisions: 1) Focus on connector quality over quantity, 2) Prioritize the insight card feedback loop, 3) Start the managed inference proxy research, 4) Plan the public beta launch for week 17. Sarah will prepare the budget proposal by next Tuesday.",
      title: "Q4 Planning Meeting Notes",
      sourceType: "calendar",
      connectorId: calendarConn?.id,
      tags: JSON.stringify(["meeting", "q4-planning", "sarah-chen", "budget", "launch"]),
      metadata: JSON.stringify({ eventId: "evt-001", attendees: ["sarah.chen", "devuser"], duration: 60 }),
      accessCount: 18,
      relevanceScore: 0.86,
      sourceTimestamp: new Date(Date.now() - 1000 * 60 * 60 * 12),
    },
    {
      content: "Security audit findings: All connector OAuth tokens are properly stored in OS keychain. Filesystem data encryption is working as expected. The audit log captures all inference calls with timestamps and purpose. One minor finding: improve rate limiting on the MCP server endpoint.",
      title: "Security Audit Report",
      sourceType: "document",
      connectorId: notionConn?.id,
      tags: JSON.stringify(["security", "audit", "oauth", "encryption"]),
      metadata: JSON.stringify({ pageId: "page-002", database: "Projects" }),
      accessCount: 6,
      relevanceScore: 0.74,
      sourceTimestamp: new Date(Date.now() - 1000 * 60 * 60 * 96),
    },
    {
      content: "The entity resolution system now correctly maps identities across sources. Sarah Chen in Gmail, sarahc in GitHub, and Sarah in Calendar events all resolve to the same canonical entity. This improves cross-source retrieval by 23%. Next step: add organization-level resolution.",
      title: "Entity Resolution Progress Update",
      sourceType: "code",
      connectorId: githubConn?.id,
      tags: JSON.stringify(["entity-resolution", "identity", "cross-source"]),
      metadata: JSON.stringify({ repo: "devuser/cortex", commit: "d4e5f6g", file: "src/memory/entities.rs" }),
      accessCount: 14,
      relevanceScore: 0.81,
      sourceTimestamp: new Date(Date.now() - 1000 * 60 * 60 * 6),
    },
    {
      content: "Experimented with memory decay and summarization. Older memories (>90 days) with <3 accesses are summarized to higher-level abstractions. This reduced our memory index from 150k to 98k chunks while preserving 97% retrieval quality on the test queries. The summarization uses Claude with a structured prompt template.",
      title: "Memory Decay and Summarization Experiment",
      sourceType: "note",
      connectorId: obsidianConn?.id,
      tags: JSON.stringify(["memory", "decay", "summarization", "experiment"]),
      metadata: JSON.stringify({ notePath: "Research/Memory-Decay.md" }),
      accessCount: 20,
      relevanceScore: 0.88,
      sourceTimestamp: new Date(Date.now() - 1000 * 60 * 60 * 60),
    },
    {
      content: "Set up the Claude API integration for the Researcher agent. Using the async HTTP client with streaming support. Average response time for a research query is 2.3 seconds. Token usage is approximately 4k input + 1k output per query. Cost per query is roughly $0.02.",
      title: "Claude API Integration for Research Agent",
      sourceType: "code",
      connectorId: githubConn?.id,
      tags: JSON.stringify(["claude", "api", "researcher", "agent", "integration"]),
      metadata: JSON.stringify({ repo: "devuser/cortex", commit: "h7i8j9k" }),
      accessCount: 16,
      relevanceScore: 0.84,
      sourceTimestamp: new Date(Date.now() - 1000 * 60 * 60 * 18),
    },
  ];

  const createdMemories = [];
  for (const m of memories) {
    const mem = await db.memory.create({ data: m });
    createdMemories.push(mem);
  }

  // Insight Cards
  const now = new Date();
  await db.insightCard.createMany({
    data: [
      {
        title: "Cross-Project Connection",
        claim: "The API authentication design Sarah Chen scheduled for Thursday aligns with the security audit finding about OAuth token management. Consider reviewing the audit report before the meeting.",
        type: "connection",
        status: "pending",
        action: "Open security audit report",
        agentType: "connector",
        priority: 8,
        memoryIds: JSON.stringify([createdMemories[0].id, createdMemories[8].id]),
        expiresAt: new Date(now.getTime() + 1000 * 60 * 60 * 72),
        createdAt: new Date(now.getTime() - 1000 * 60 * 15),
      },
      {
        title: "Pending Commitment",
        claim: "You mentioned in the Q4 planning meeting that Sarah would prepare the budget proposal by next Tuesday. Today is Wednesday — the deadline has passed. Follow up with Sarah.",
        type: "reminder",
        status: "surfaced",
        action: "Send reminder to Sarah Chen",
        agentType: "planner",
        priority: 9,
        memoryIds: JSON.stringify([createdMemories[7].id]),
        expiresAt: new Date(now.getTime() + 1000 * 60 * 60 * 24),
        createdAt: new Date(now.getTime() - 1000 * 60 * 60 * 3),
      },
      {
        title: "PR Review Opportunity",
        claim: "Marcus Webb's PR #142 for Drafter agent improvements is awaiting review. Given your architecture decision on hybrid retrieval, the template-based approach could complement the reranking pipeline.",
        type: "suggestion",
        status: "pending",
        action: "Review PR #142",
        agentType: "connector",
        priority: 7,
        memoryIds: JSON.stringify([createdMemories[5].id, createdMemories[2].id]),
        expiresAt: new Date(now.getTime() + 1000 * 60 * 60 * 48),
        createdAt: new Date(now.getTime() - 1000 * 60 * 60),
      },
      {
        title: "Weekly Digest",
        claim: "This week: 5 PRs merged, 3 connectors synced, 12 new insight cards generated. The Gmail connector processed 347 new emails. Memory index grew by 2.3% to reach 98,412 chunks. Agent traces show 99.2% success rate.",
        type: "summary",
        status: "acted",
        agentType: "drafter",
        priority: 4,
        memoryIds: JSON.stringify([createdMemories[6].id]),
        expiresAt: new Date(now.getTime() + 1000 * 60 * 60 * 168),
        createdAt: new Date(now.getTime() - 1000 * 60 * 60 * 24),
      },
      {
        title: "Draft Reply Ready",
        claim: "An email from Acme Corp about extending the pilot program needs a response. Based on your previous feedback notes and the pilot progress, a draft reply has been prepared suggesting a 3-month extension with monthly check-ins.",
        type: "draft",
        status: "pending",
        action: "Review and send draft reply",
        agentType: "drafter",
        priority: 8,
        memoryIds: JSON.stringify([createdMemories[3].id]),
        expiresAt: new Date(now.getTime() + 1000 * 60 * 60 * 24),
        createdAt: new Date(now.getTime() - 1000 * 60 * 30),
      },
      {
        title: "Architecture Consistency Check",
        claim: "Your sprint retrospective noted that GitHub connector is the reference implementation. The entity resolution progress update shows cross-source identity mapping improvements that could be documented as a connector pattern.",
        type: "connection",
        status: "dismissed",
        feedback: "already_knew",
        agentType: "connector",
        priority: 5,
        memoryIds: JSON.stringify([createdMemories[4].id, createdMemories[9].id]),
        expiresAt: new Date(now.getTime() - 1000 * 60 * 60 * 24),
        createdAt: new Date(now.getTime() - 1000 * 60 * 60 * 48),
      },
      {
        title: "Performance Opportunity",
        claim: "Memory decay experiments reduced the index from 150k to 98k chunks. Combined with the 120ms retrieval latency benchmark, the system is well-positioned for the public beta performance targets.",
        type: "suggestion",
        status: "surfaced",
        agentType: "planner",
        priority: 6,
        memoryIds: JSON.stringify([createdMemories[10].id, createdMemories[6].id]),
        expiresAt: new Date(now.getTime() + 1000 * 60 * 60 * 120),
        createdAt: new Date(now.getTime() - 1000 * 60 * 60 * 8),
      },
    ]
  });

  // Chat Sessions
  const session1 = await db.chatSession.create({
    data: {
      title: "Authentication Architecture Research",
      messages: {
        create: [
          {
            role: "user",
            content: "What decisions have we made about the authentication flow for the API design review?",
          },
          {
            role: "assistant",
            content: "Based on your notes and recent activity, here's what I found:\n\n**Architecture Decision**: You decided on a **hybrid retrieval strategy** combining dense embeddings with BM25 keyword search, with cross-encoder reranking for top 50 candidates (94% recall on test set).\n\n**Security Context**: The recent security audit confirmed that OAuth tokens are properly stored in the OS keychain and filesystem data encryption is working as expected. One minor finding was to improve rate limiting on the MCP server endpoint.\n\n**Upcoming**: Sarah Chen scheduled an API design review for **Thursday at 2pm** covering OAuth 2.0 implementation, token refresh, and rate limiting strategies.\n\n**Sources**: 3 memories referenced",
            memoryIds: JSON.stringify([createdMemories[0].id, createdMemories[8].id, createdMemories[2].id]),
          },
          {
            role: "user",
            content: "What was the customer feedback about notification frequency?",
          },
          {
            role: "assistant",
            content: "From the **Acme Corp pilot feedback**:\n\n- They **love the proactive insight cards** but want **more control over notification frequency**\n- The **weekly digest feature** was the most requested addition\n- Sarah Chen from Acme is your main contact and has been providing excellent feedback\n- They're willing to be a **reference customer**\n\nThis aligns with your insight card feedback loop design — the primary learning loop where user feedback tunes future surfacing.\n\n**Sources**: 1 memory referenced",
            memoryIds: JSON.stringify([createdMemories[3].id]),
          },
        ]
      }
    }
  });

  const session2 = await db.chatSession.create({
    data: {
      title: "Performance Optimization Review",
      messages: {
        create: [
          {
            role: "user",
            content: "How does our current performance compare to targets?",
          },
          {
            role: "assistant",
            content: "Here's the current performance status against your targets:\n\n| Metric | Target | Actual | Status |\n|--------|--------|--------|--------|\n| Retrieval latency (100k memories) | <150ms | **120ms** | ✅ 20% under target |\n| Daemon cold start | <300ms | **180ms** | ✅ 40% under target |\n| Memory usage (peak) | <250MB | **220MB** | ✅ |\n| Agent success rate | - | **99.2%** | ✅ |\n\nAdditionally, your memory decay experiments reduced the index from **150k to 98k chunks** while preserving **97% retrieval quality**.\n\n**Sources**: 2 memories referenced",
            memoryIds: JSON.stringify([createdMemories[6].id, createdMemories[10].id]),
          }
        ]
      }
    }
  });

  // Agent Traces
  const traceTimes = [
    1000 * 60 * 2, // 2 min ago
    1000 * 60 * 15,
    1000 * 60 * 30,
    1000 * 60 * 45,
    1000 * 60 * 60,
    1000 * 60 * 90,
    1000 * 60 * 120,
    1000 * 60 * 180,
    1000 * 60 * 240,
    1000 * 60 * 300,
    1000 * 60 * 360,
    1000 * 60 * 480,
  ];

  const agentTypes = ['indexer', 'researcher', 'connector', 'drafter', 'planner', 'orchestrator'];
  const statuses = ['completed', 'completed', 'completed', 'completed', 'completed', 'failed'];

  for (let i = 0; i < 12; i++) {
    const agentType = agentTypes[i % agentTypes.length];
    const status = i === 7 ? 'failed' : 'completed';
    const durationMs = status === 'failed' ? 15234 : Math.floor(Math.random() * 5000) + 500;

    await db.agentTrace.create({
      data: {
        agentType,
        status,
        input: JSON.stringify({
          query: agentType === 'researcher' ? 'authentication architecture decisions' : agentType === 'connector' ? 'find semantic links in recent activity' : agentType === 'indexer' ? 'sync new items from gmail' : agentType === 'drafter' ? 'generate weekly digest' : agentType === 'planner' ? 'check pending commitments' : 'route user query to appropriate agent',
          timestamp: new Date(Date.now() - traceTimes[i]).toISOString(),
        }),
        output: status === 'failed' ? null : JSON.stringify({
          result: agentType === 'researcher' ? 'Found 3 relevant memories about auth architecture' : agentType === 'connector' ? 'Generated 2 new insight cards' : agentType === 'indexer' ? 'Indexed 47 new items from Gmail' : agentType === 'drafter' ? 'Weekly digest drafted and queued' : agentType === 'planner' ? '1 pending commitment detected' : 'Routed to researcher agent',
          memoriesAccessed: Math.floor(Math.random() * 20) + 3,
        }),
        memoryIds: JSON.stringify(createdMemories.slice(0, Math.floor(Math.random() * 5) + 1).map(m => m.id)),
        error: status === 'failed' ? 'Timeout: inference endpoint did not respond within 15s' : null,
        durationMs,
        steps: JSON.stringify([
          { step: 1, action: 'parse_input', duration: Math.floor(Math.random() * 100) + 10 },
          { step: 2, action: 'retrieve_memories', duration: Math.floor(Math.random() * 500) + 50 },
          { step: 3, action: 'run_inference', duration: Math.floor(Math.random() * 3000) + 200 },
          { step: 4, action: 'format_output', duration: Math.floor(Math.random() * 100) + 10 },
        ]),
        createdAt: new Date(Date.now() - traceTimes[i]),
      }
    });
  }

  console.log('Seed completed successfully!');
  console.log(`  - 9 settings`);
  console.log(`  - 8 connectors`);
  console.log(`  - 6 entities`);
  console.log(`  - 12 memories`);
  console.log(`  - 7 insight cards`);
  console.log(`  - 2 chat sessions (5 messages)`);
  console.log(`  - 12 agent traces`);
}

seed()
  .catch(console.error)
  .finally(() => process.exit(0));

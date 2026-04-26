/**
 * BULLMQ QUEUE CONFIGURATION
 *
 * Background job processing using BullMQ.
 * Follows ADR-014: Agent Execution Framework
 *
 * Features:
 * - Redis-backed job queues
 * - Job priorities and scheduling
 * - Retry logic with exponential backoff
 * - Job event listeners
 * - Worker pools
 */

import { Queue, Worker, Job, QueueEvents } from 'bullmq';
import IORedis from 'ioredis';

// ===========================================
// TYPES & INTERFACES
// ===========================================

export type AgentType =
  | 'indexer'
  | 'researcher'
  | 'connector'
  | 'drafter'
  | 'planner'
  | 'orchestrator';

export interface AgentJobData {
  agentType: AgentType;
  userId: string;
  taskId?: string;
  input: Record<string, unknown>;
  priority?: number;
}

export interface AgentJobResult {
  success: boolean;
  output?: Record<string, unknown>;
  error?: string;
  durationMs: number;
  steps: Array<{
    step: string;
    status: 'running' | 'completed' | 'failed';
    timestamp: Date;
  }>;
}

export interface AgentJobOptions {
  delay?: number;
  attempts?: number;
  backoff?: {
    type: 'exponential' | 'fixed';
    delay: number;
  };
  priority?: number;
  removeOnComplete?: number;
  removeOnFail?: number;
}

// ===========================================
// CONNECTION CONFIGURATION
// ===========================================

// Redis connection configuration
const REDIS_CONFIG = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD,
  db: parseInt(process.env.REDIS_DB || '0'),
  maxRetriesPerRequest: null, // Required by BullMQ
  enableReadyCheck: false,
};

// Lazy Redis connection - only create when actually used
let redisConnectionInstance: IORedis | null = null;

export function getRedisConnection(): IORedis {
  if (!redisConnectionInstance) {
    redisConnectionInstance = new IORedis(REDIS_CONFIG);

    // Connection event listeners
    redisConnectionInstance.on('connect', () => {
      console.log('[BullMQ] Redis connected');
    });

    redisConnectionInstance.on('error', (error: Error) => {
      console.error('[BullMQ] Redis connection error:', error);
    });
  }
  return redisConnectionInstance;
}

// Export a proxy that defers initialization until first use
export const redisConnection = new Proxy({} as IORedis, {
  get(target, prop) {
    const conn = getRedisConnection();
    return conn[prop as keyof IORedis];
  },
});

// ===========================================
// QUEUE DEFINITIONS
// ===========================================

export const QUEUE_NAMES: Record<AgentType, string> = {
  indexer: 'agents-indexer',
  researcher: 'agents-researcher',
  connector: 'agents-connector',
  drafter: 'agents-drafter',
  planner: 'agents-planner',
  orchestrator: 'agents-orchestrator',
};

// Lazy queue initialization - only create when actually used
const queuesCache: Record<AgentType, Queue | null> = {
  indexer: null,
  researcher: null,
  connector: null,
  drafter: null,
  planner: null,
  orchestrator: null,
};

// Queue options
const getQueueOptions = () => ({
  connection: getRedisConnection(),
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 1000,
    },
    removeOnComplete: 1000,
    removeOnFail: 5000,
  },
});

// Create queues for each agent type (lazy initialization)
export const agentQueues: Record<AgentType, Queue> = new Proxy({} as Record<AgentType, Queue>, {
  get(target, prop) {
    const agentType = prop as AgentType;
    if (!queuesCache[agentType]) {
      queuesCache[agentType] = new Queue(QUEUE_NAMES[agentType], getQueueOptions());
    }
    return queuesCache[agentType];
  },
});

// ===========================================
// QUEUE HELPER FUNCTIONS
// ===========================================

/**
 * Get queue for agent type
 */
export function getQueue(agentType: AgentType): Queue {
  return agentQueues[agentType];
}

/**
 * Add job to agent queue
 */
export async function addAgentJob(
  agentType: AgentType,
  data: AgentJobData,
  options?: AgentJobOptions
): Promise<Job<AgentJobData, AgentJobResult, string>> {
  const queue = getQueue(agentType);

  const jobOptions = {
    ...QUEUE_OPTIONS.defaultJobOptions,
    ...options,
  };

  const job = await queue.add(`${agentType}-job`, data, jobOptions);

  console.log(`[BullMQ] Added ${agentType} job:`, job.id);

  return job;
}

/**
 * Add multiple jobs to agent queue
 */
export async function addAgentJobs(
  agentType: AgentType,
  jobs: Array<{ data: AgentJobData; options?: AgentJobOptions }>
): Promise<Job<AgentJobData, AgentJobResult, string>[]> {
  const queue = getQueue(agentType);

  const jobOptions = jobs.map((job) => ({
    ...QUEUE_OPTIONS.defaultJobOptions,
    ...job.options,
  }));

  const addedJobs = await queue.addBulk(
    jobs.map((job, index) => ({
      name: `${agentType}-job`,
      data: job.data,
      opts: jobOptions[index],
    }))
  );

  console.log(`[BullMQ] Added ${addedJobs.length} ${agentType} jobs`);

  return addedJobs;
}

/**
 * Get job by ID
 */
export async function getJob(
  agentType: AgentType,
  jobId: string
): Promise<Job<AgentJobData, AgentJobResult, string> | undefined> {
  const queue = getQueue(agentType);
  return await queue.getJob(jobId);
}

/**
 * Get queue statistics
 */
export async function getQueueStats(agentType: AgentType) {
  const queue = getQueue(agentType);

  const [waiting, active, completed, failed, delayed] = await Promise.all([
    queue.getWaitingCount(),
    queue.getActiveCount(),
    queue.getCompletedCount(),
    queue.getFailedCount(),
    queue.getDelayedCount(),
  ]);

  return {
    waiting,
    active,
    completed,
    failed,
    delayed,
  };
}

/**
 * Get all queue statistics
 */
export async function getAllQueueStats(): Promise<Record<AgentType, ReturnType<typeof getQueueStats>>> {
  const stats: Record<string, Awaited<ReturnType<typeof getQueueStats>>> = {};

  for (const agentType of Object.keys(QUEUE_NAMES) as AgentType[]) {
    stats[agentType] = await getQueueStats(agentType);
  }

  return stats as Record<AgentType, Awaited<ReturnType<typeof getQueueStats>>>;
}

/**
 * Clean old jobs from queue
 */
export async function cleanQueue(
  agentType: AgentType,
  grace: number = 24 * 60 * 60 * 1000 // 24 hours
): Promise<void> {
  const queue = getQueue(agentType);

  await queue.clean(grace, 1000, 'completed');
  await queue.clean(grace, 1000, 'failed');

  console.log(`[BullMQ] Cleaned ${agentType} queue`);
}

/**
 * Pause queue
 */
export async function pauseQueue(agentType: AgentType): Promise<void> {
  const queue = getQueue(agentType);
  await queue.pause();
  console.log(`[BullMQ] Paused ${agentType} queue`);
}

/**
 * Resume queue
 */
export async function resumeQueue(agentType: AgentType): Promise<void> {
  const queue = getQueue(agentType);
  await queue.resume();
  console.log(`[BullMQ] Resumed ${agentType} queue`);
}

/**
 * Obliterate queue (remove all jobs)
 */
export async function obliterateQueue(agentType: AgentType): Promise<void> {
  const queue = getQueue(agentType);
  await queue.obliterate({ force: true });
  console.log(`[BullMQ] Obliterated ${agentType} queue`);
}

// ===========================================
// QUEUE EVENTS
// ===========================================

const queueEventsCache: Record<AgentType, QueueEvents | null> = {
  indexer: null,
  researcher: null,
  connector: null,
  drafter: null,
  planner: null,
  orchestrator: null,
};

// Lazy queue events initialization
export const queueEvents: Record<AgentType, QueueEvents> = new Proxy({} as Record<AgentType, QueueEvents>, {
  get(target, prop) {
    const agentType = prop as AgentType;
    if (!queueEventsCache[agentType]) {
      queueEventsCache[agentType] = new QueueEvents(QUEUE_NAMES[agentType], { connection: getRedisConnection() });
    }
    return queueEventsCache[agentType];
  },
});

/**
 * Set up event listeners for queue
 */
export function setupQueueEvents(agentType: AgentType): void {
  const events = queueEvents[agentType];

  events.on('waiting', (jobId: string) => {
    console.log(`[BullMQ] ${agentType} job ${jobId} is waiting`);
  });

  events.on('active', (jobId: string) => {
    console.log(`[BullMQ] ${agentType} job ${jobId} is now active`);
  });

  events.on('completed', (jobId: string, result: AgentJobResult) => {
    console.log(`[BullMQ] ${agentType} job ${jobId} completed:`, result);
  });

  events.on('failed', (jobId: string, error: Error) => {
    console.error(`[BullMQ] ${agentType} job ${jobId} failed:`, error.message);
  });

  events.on('progress', (jobId: string, progress: number) => {
    console.log(`[BullMQ] ${agentType} job ${jobId} progress: ${progress}%`);
  });
}

// ===========================================
// GRACEFUL SHUTDOWN
// ===========================================

export async function closeQueues(): Promise<void> {
  console.log('[BullMQ] Closing queues...');

  const closePromises = [
    ...Object.values(queuesCache).filter(q => q !== null).map((queue) => queue!.close()),
    ...Object.values(queueEventsCache).filter(e => e !== null).map((events) => events!.close()),
  ];

  if (redisConnectionInstance) {
    closePromises.push(redisConnectionInstance.quit());
  }

  await Promise.all(closePromises);

  console.log('[BullMQ] All queues closed');
}

// Handle process termination
process.on('SIGTERM', async () => {
  await closeQueues();
  process.exit(0);
});

process.on('SIGINT', async () => {
  await closeQueues();
  process.exit(0);
});

/**
 * EMBEDDING SERVICE
 *
 * Generates vector embeddings for semantic search using OpenAI API.
 * Follows ADR-013: Vector Database Strategy
 *
 * Features:
 * - Batch embedding generation
 * - Error handling with retry logic
 * - Cost tracking and estimation
 * - Rate limit handling
 */

import OpenAI from 'openai';

// ===========================================
// TYPES & INTERFACES
// ===========================================

export interface EmbeddingResponse {
  embedding: number[];
  model: string;
  usage: {
    promptTokens: number;
    totalTokens: number;
  };
}

export interface BatchEmbeddingResponse {
  embeddings: number[][];
  model: string;
  usage: {
    promptTokens: number;
    totalTokens: number;
  };
}

export interface EmbeddingOptions {
  text: string;
  model?: 'text-embedding-3-small' | 'text-embedding-3-large' | 'text-embedding-ada-002';
}

export interface BatchEmbeddingOptions {
  texts: string[];
  model?: 'text-embedding-3-small' | 'text-embedding-3-large' | 'text-embedding-ada-002';
}

// ===========================================
// MODEL CONFIGURATION
// ===========================================

const EMBEDDING_MODELS = {
  'text-embedding-3-small': {
    dimensions: 1536,
    maxTokens: 8191,
    costPer1kTokens: 0.00002, // $0.02 per 1M tokens
  },
  'text-embedding-3-large': {
    dimensions: 3072,
    maxTokens: 8191,
    costPer1kTokens: 0.00013, // $0.13 per 1M tokens
  },
  'text-embedding-ada-002': {
    dimensions: 1536,
    maxTokens: 8191,
    costPer1kTokens: 0.0001, // $0.10 per 1M tokens
  },
} as const;

const DEFAULT_MODEL = 'text-embedding-3-small' as const;

// ===========================================
// ERROR HANDLING
// ===========================================

export class EmbeddingError extends Error {
  constructor(message: string, public retryable: boolean = false) {
    super(message);
    this.name = 'EmbeddingError';
  }
}

export class RateLimitError extends EmbeddingError {
  constructor() {
    super('Rate limit exceeded for embeddings API', true);
    this.name = 'RateLimitError';
  }
}

// ===========================================
// MAIN CLIENT CLASS
// ===========================================

export class EmbeddingClient {
  private client: OpenAI;
  private defaultModel = DEFAULT_MODEL;

  constructor(apiKey?: string) {
    const key = apiKey || process.env.OPENAI_API_KEY;
    if (!key) {
      throw new Error('OPENAI_API_KEY is required for embeddings');
    }

    this.client = new OpenAI({
      apiKey: key,
    });
  }

  /**
   * Generate embedding for a single text
   */
  async generateEmbedding(options: EmbeddingOptions): Promise<EmbeddingResponse> {
    const model = options.model || this.defaultModel;

    try {
      const response = await this.client.embeddings.create({
        model,
        input: options.text,
      });

      const data = response.data[0];

      return {
        embedding: data.embedding,
        model: response.model,
        usage: {
          promptTokens: response.usage.prompt_tokens,
          totalTokens: response.usage.total_tokens,
        },
      };
    } catch (error) {
      this.handleError(error);
      throw error; // Never reached
    }
  }

  /**
   * Generate embeddings for multiple texts (batch)
   * More efficient than multiple single calls
   */
  async generateBatchEmbeddings(
    options: BatchEmbeddingOptions
  ): Promise<BatchEmbeddingResponse> {
    const model = options.model || this.defaultModel;

    try {
      const response = await this.client.embeddings.create({
        model,
        input: options.texts,
      });

      return {
        embeddings: response.data.map((d) => d.embedding),
        model: response.model,
        usage: {
          promptTokens: response.usage.prompt_tokens,
          totalTokens: response.usage.total_tokens,
        },
      };
    } catch (error) {
      this.handleError(error);
      throw error; // Never reached
    }
  }

  /**
   * Calculate cost based on token usage
   */
  calculateCost(model: typeof DEFAULT_MODEL, tokens: number): number {
    const config = EMBEDDING_MODELS[model];
    return (tokens / 1000) * config.costPer1kTokens;
  }

  /**
   * Estimate cost before generating embeddings
   */
  estimateCost(
    model: typeof DEFAULT_MODEL,
    texts: string | string[]
  ): number {
    const textArray = Array.isArray(texts) ? texts : [texts];
    const totalTokens = textArray.reduce((sum, text) => {
      return sum + this.estimateTokens(text);
    }, 0);

    return this.calculateCost(model, totalTokens);
  }

  /**
   * Estimate token count (rough approximation: ~4 chars per token)
   */
  private estimateTokens(text: string): number {
    return Math.ceil(text.length / 4);
  }

  /**
   * Handle API errors
   */
  private handleError(error: unknown): never {
    if (error instanceof OpenAI.APIError) {
      if (error.status === 429) {
        throw new RateLimitError();
      }
      throw new EmbeddingError(
        error.message,
        error.status >= 500 || error.status === 429
      );
    }

    if (error instanceof Error) {
      throw new EmbeddingError(error.message);
    }

    throw new EmbeddingError('Unknown error occurred');
  }

  /**
   * Test API connection
   */
  async testConnection(): Promise<boolean> {
    try {
      await this.generateEmbedding({ text: 'test' });
      return true;
    } catch (error) {
      console.error('Embedding API connection test failed:', error);
      return false;
    }
  }
}

// ===========================================
// SINGLETON INSTANCE
// ===========================================

let clientInstance: EmbeddingClient | null = null;

export function getEmbeddingClient(): EmbeddingClient | null {
  // Don't create client during build time
  if (process.env.NEXT_BUILD === '1' || process.env.NODE_ENV === undefined) {
    return null;
  }

  if (!clientInstance) {
    try {
      clientInstance = new EmbeddingClient();
    } catch (error) {
      console.warn('Failed to create embedding client:', error);
      return null;
    }
  }
  return clientInstance;
}

// ===========================================
// HELPER FUNCTIONS
// ===========================================

/**
 * Retry logic with exponential backoff
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      if (error instanceof EmbeddingError && error.retryable && attempt < maxRetries - 1) {
        const delay = baseDelay * Math.pow(2, attempt);
        console.log(`Retry attempt ${attempt + 1}/${maxRetries} after ${delay}ms`);
        await new Promise((resolve) => setTimeout(resolve, delay));
        continue;
      }
      throw error;
    }
  }
  throw new Error('Max retries exceeded');
}

/**
 * Normalize vector for cosine similarity
 */
export function normalizeVector(vector: number[]): number[] {
  const magnitude = Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0));
  if (magnitude === 0) return vector;
  return vector.map((val) => val / magnitude);
}

/**
 * Calculate cosine similarity between two vectors
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error('Vectors must have the same length');
  }

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

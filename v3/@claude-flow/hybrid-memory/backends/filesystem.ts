/**
 * ADR-009: Hybrid Memory - Filesystem Backend
 */

import { MemoryBackend } from '../src';
import { readFile, writeFile, unlink, readdir } from 'fs/promises';
import { join } from 'path';

export class FilesystemBackend implements MemoryBackend {
  private basePath: string;

  constructor(basePath: string) {
    this.basePath = basePath;
  }

  private getFilePath(key: string): string {
    return join(this.basePath, `${key}.json`);
  }

  async get(key: string): Promise<any> {
    try {
      const data = await readFile(this.getFilePath(key), 'utf-8');
      const parsed = JSON.parse(data);

      // Check TTL
      if (parsed.expires && Date.now() > parsed.expires) {
        await this.delete(key);
        return null;
      }

      return parsed.value;
    } catch {
      return null;
    }
  }

  async set(key: string, value: any, ttl?: number): Promise<void> {
    const data = {
      value,
      expires: ttl ? Date.now() + ttl * 1000 : undefined,
    };

    await writeFile(this.getFilePath(key), JSON.stringify(data));
  }

  async delete(key: string): Promise<void> {
    try {
      await unlink(this.getFilePath(key));
    } catch {
      // Ignore errors
    }
  }

  async clear(): Promise<void> {
    const files = await readdir(this.basePath);
    await Promise.all(
      files
        .filter(f => f.endsWith('.json'))
        .map(f => unlink(join(this.basePath, f)))
    );
  }

  async has(key: string): Promise<boolean> {
    return (await this.get(key)) !== null;
  }
}

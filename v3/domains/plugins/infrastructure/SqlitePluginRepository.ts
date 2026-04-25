/**
 * SQLite Plugin Repository - ADR-004
 *
 * SQLite implementation of plugin persistence
 */

import Database from 'better-sqlite3';
import { Plugin, PluginStatus } from '../../domain/entities/Plugin';
import { PluginRepository } from '../../domain/repositories/PluginRepository';

export class SqlitePluginRepository implements PluginRepository {
  private db: Database.Database;

  constructor(dbPath: string = './plugins.db') {
    this.db = new Database(dbPath);
    this.initializeSchema();
  }

  private initializeSchema(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS plugins (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        version TEXT NOT NULL,
        description TEXT,
        author TEXT,
        type TEXT NOT NULL,
        status TEXT NOT NULL,
        installed_at TEXT NOT NULL,
        activated_at TEXT,
        last_error TEXT,
        config TEXT,
        capabilities_provides TEXT,
        capabilities_consumes TEXT,
        capabilities_hooks TEXT,
        permissions TEXT,
        dependencies TEXT,
        minimum_version TEXT
      );

      CREATE INDEX IF NOT EXISTS idx_plugins_status ON plugins(status);
      CREATE INDEX IF NOT EXISTS idx_plugins_type ON plugins(type);
    `);
  }

  async save(plugin: Plugin): Promise<void> {
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO plugins (
        id, name, version, description, author, type, status,
        installed_at, activated_at, last_error, config,
        capabilities_provides, capabilities_consumes, capabilities_hooks,
        permissions, dependencies, minimum_version
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      plugin.id,
      plugin.metadata.name,
      plugin.metadata.version,
      plugin.metadata.description,
      plugin.metadata.author,
      plugin.metadata.type,
      plugin.status,
      plugin.installedAt.toISOString(),
      plugin.activatedAt?.toISOString() || null,
      plugin.lastError?.message || null,
      JSON.stringify(plugin.config),
      JSON.stringify(plugin.capabilities.provides),
      JSON.stringify(plugin.capabilities.consumes),
      JSON.stringify(plugin.capabilities.hooks || []),
      JSON.stringify(plugin.metadata.permissions || []),
      JSON.stringify(plugin.metadata.dependencies || []),
      plugin.metadata.minimumClaudeFlowVersion || null
    );
  }

  async findById(id: string): Promise<Plugin | null> {
    const stmt = this.db.prepare('SELECT * FROM plugins WHERE id = ?');
    const row = stmt.get(id) as any;

    if (!row) {
      return null;
    }

    return this.mapRowToPlugin(row);
  }

  async findAll(): Promise<Plugin[]> {
    const stmt = this.db.prepare('SELECT * FROM plugins');
    const rows = stmt.all() as any[];
    return rows.map(row => this.mapRowToPlugin(row));
  }

  async findByStatus(status: Plugin['status']): Promise<Plugin[]> {
    const stmt = this.db.prepare('SELECT * FROM plugins WHERE status = ?');
    const rows = stmt.all(status) as any[];
    return rows.map(row => this.mapRowToPlugin(row));
  }

  async findByType(type: string): Promise<Plugin[]> {
    const stmt = this.db.prepare('SELECT * FROM plugins WHERE type = ?');
    const rows = stmt.all(type) as any[];
    return rows.map(row => this.mapRowToPlugin(row));
  }

  async delete(id: string): Promise<void> {
    const stmt = this.db.prepare('DELETE FROM plugins WHERE id = ?');
    stmt.run(id);
  }

  async exists(id: string): Promise<boolean> {
    const stmt = this.db.prepare('SELECT COUNT(*) as count FROM plugins WHERE id = ?');
    const result = stmt.get(id) as { count: number };
    return result.count > 0;
  }

  private mapRowToPlugin(row: any): Plugin {
    const plugin = new Plugin(
      row.id,
      {
        name: row.name,
        version: row.version,
        description: row.description,
        author: row.author,
        type: row.type,
        dependencies: JSON.parse(row.dependencies || '[]'),
        permissions: JSON.parse(row.permissions || '[]'),
        minimumClaudeFlowVersion: row.minimum_version
      },
      {
        provides: JSON.parse(row.capabilities_provides || '[]'),
        consumes: JSON.parse(row.capabilities_consumes || '[]'),
        hooks: JSON.parse(row.capabilities_hooks || '[]')
      },
      JSON.parse(row.config || '{}')
    );

    plugin.status = row.status;
    plugin.installedAt = new Date(row.installed_at);
    if (row.activated_at) {
      plugin.activatedAt = new Date(row.activated_at);
    }
    if (row.last_error) {
      plugin.lastError = new Error(row.last_error);
    }

    return plugin;
  }

  close(): void {
    this.db.close();
  }
}

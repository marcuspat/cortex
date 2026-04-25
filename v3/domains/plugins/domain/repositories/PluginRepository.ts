/**
 * Plugin Repository Interface - ADR-004
 *
 * Defines the contract for plugin persistence
 */

import { Plugin } from '../entities/Plugin';

export interface PluginRepository {
  save(plugin: Plugin): Promise<void>;
  findById(id: string): Promise<Plugin | null>;
  findAll(): Promise<Plugin[]>;
  findByStatus(status: Plugin['status']): Promise<Plugin[]>;
  findByType(type: string): Promise<Plugin[]>;
  delete(id: string): Promise<void>;
  exists(id: string): Promise<boolean>;
}

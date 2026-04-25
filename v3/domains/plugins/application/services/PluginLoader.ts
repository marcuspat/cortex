/**
 * Plugin Loader - ADR-004
 *
 * Handles dynamic loading of plugins from various sources
 */

import { Plugin } from '../../domain/entities/Plugin';
import { PluginManifest, validatePluginManifest } from '../../domain/entities/PluginManifest';
import { readFile } from 'fs/promises';
import { join } from 'path';

export interface PluginLoadOptions {
  validateManifest?: boolean;
  checkDependencies?: boolean;
  sandbox?: boolean;
}

export class PluginLoader {
  async loadFromDirectory(pluginPath: string, options: PluginLoadOptions = {}): Promise<Plugin> {
    const manifestPath = join(pluginPath, 'plugin.json');
    const manifestContent = await readFile(manifestPath, 'utf-8');
    const manifest = JSON.parse(manifestContent);

    if (options.validateManifest !== false && !validatePluginManifest(manifest)) {
      throw new Error(`Invalid plugin manifest at ${manifestPath}`);
    }

    // Generate plugin ID from name and version
    const id = `${manifest.name}@${manifest.version}`;

    return new Plugin(
      id,
      {
        name: manifest.name,
        version: manifest.version,
        description: manifest.description,
        author: manifest.author,
        type: manifest.type as any,
        dependencies: Object.keys(manifest.dependencies || {}),
        permissions: manifest.permissions,
        minimumClaudeFlowVersion: manifest.minimumClaudeFlowVersion
      },
      {
        provides: manifest.capabilities?.provides || [],
        consumes: manifest.capabilities?.consumes || [],
        hooks: manifest.capabilities?.hooks
      },
      manifest.config
    );
  }

  async loadFromNPM(packageName: string, options: PluginLoadOptions = {}): Promise<Plugin> {
    // This would integrate with npm registry
    // For now, placeholder implementation
    throw new Error('NPM marketplace integration not yet implemented');
  }

  async loadFromURL(url: string, options: PluginLoadOptions = {}): Promise<Plugin> {
    // This would download and load plugin from URL
    throw new Error('URL plugin loading not yet implemented');
  }

  async validateDependencies(plugin: Plugin, installedPlugins: Plugin[]): Promise<boolean> {
    if (!plugin.metadata.dependencies || plugin.metadata.dependencies.length === 0) {
      return true;
    }

    const installedIds = new Set(installedPlugins.map(p => p.id));
    for (const dep of plugin.metadata.dependencies) {
      if (!installedIds.has(dep)) {
        return false;
      }
    }

    return true;
  }
}

/**
 * Plugin Lifecycle Manager - ADR-004
 *
 * Manages plugin installation, activation, deactivation, and uninstallation
 */

import { Plugin, PluginStatus } from '../../domain/entities/Plugin';
import { PluginRepository } from '../../domain/repositories/PluginRepository';
import { PluginLoader } from './PluginLoader';
import { EventEmitter } from 'events';

export interface LifecycleOptions {
  autoActivate?: boolean;
  skipDependencyCheck?: boolean;
  force?: boolean;
}

export class PluginLifecycleManager extends EventEmitter {
  constructor(
    private repository: PluginRepository,
    private loader: PluginLoader
  ) {
    super();
  }

  async install(
    pluginPath: string,
    options: LifecycleOptions = {}
  ): Promise<Plugin> {
    // Load plugin
    const plugin = await this.loader.loadFromDirectory(pluginPath, {
      validateManifest: true,
      checkDependencies: !options.skipDependencyCheck
    });

    // Check if already installed
    const exists = await this.repository.exists(plugin.id);
    if (exists && !options.force) {
      throw new Error(`Plugin ${plugin.id} is already installed`);
    }

    // Validate dependencies
    if (!options.skipDependencyCheck) {
      const installed = await this.repository.findAll();
      const depsValid = await this.loader.validateDependencies(plugin, installed);
      if (!depsValid) {
        throw new Error(`Plugin ${plugin.id} has unmet dependencies`);
      }
    }

    // Save plugin
    await this.repository.save(plugin);
    this.emit('installed', plugin);

    // Auto-activate if requested
    if (options.autoActivate) {
      await this.activate(plugin.id);
    }

    return plugin;
  }

  async activate(pluginId: string): Promise<Plugin> {
    const plugin = await this.repository.findById(pluginId);
    if (!plugin) {
      throw new Error(`Plugin ${pluginId} not found`);
    }

    if (plugin.status === PluginStatus.ACTIVATED) {
      return plugin;
    }

    // Check if plugin can be activated (dependencies satisfied)
    const installed = await this.repository.findAll();
    const depsValid = await this.loader.validateDependencies(plugin, installed);
    if (!depsValid) {
      throw new Error(`Cannot activate ${pluginId}: unmet dependencies`);
    }

    try {
      plugin.activate();
      await this.repository.save(plugin);
      this.emit('activated', plugin);
      return plugin;
    } catch (error) {
      plugin.setError(error as Error);
      await this.repository.save(plugin);
      this.emit('error', { plugin, error });
      throw error;
    }
  }

  async deactivate(pluginId: string): Promise<Plugin> {
    const plugin = await this.repository.findById(pluginId);
    if (!plugin) {
      throw new Error(`Plugin ${pluginId} not found`);
    }

    if (plugin.status !== PluginStatus.ACTIVATED) {
      return plugin;
    }

    // Check if other plugins depend on this one
    const allPlugins = await this.repository.findAll();
    const dependents = allPlugins.filter(p =>
      p.metadata.dependencies?.includes(pluginId) &&
      p.status === PluginStatus.ACTIVATED
    );

    if (dependents.length > 0) {
      const dependentNames = dependents.map(p => p.id).join(', ');
      throw new Error(
        `Cannot deactivate ${pluginId}: required by ${dependentNames}`
      );
    }

    plugin.deactivate();
    await this.repository.save(plugin);
    this.emit('deactivated', plugin);
    return plugin;
  }

  async uninstall(pluginId: string, force = false): Promise<void> {
    const plugin = await this.repository.findById(pluginId);
    if (!plugin) {
      throw new Error(`Plugin ${pluginId} not found`);
    }

    if (plugin.status === PluginStatus.ACTIVATED) {
      if (force) {
        await this.deactivate(pluginId);
      } else {
        throw new Error(`Plugin ${pluginId} must be deactivated before uninstalling`);
      }
    }

    // Check if other plugins depend on this one
    const allPlugins = await this.repository.findAll();
    const dependents = allPlugins.filter(p =>
      p.metadata.dependencies?.includes(pluginId)
    );

    if (dependents.length > 0 && !force) {
      const dependentNames = dependents.map(p => p.id).join(', ');
      throw new Error(
        `Cannot uninstall ${pluginId}: required by ${dependentNames}`
      );
    }

    plugin.uninstall();
    await this.repository.delete(pluginId);
    this.emit('uninstalled', plugin);
  }

  async updateConfig(pluginId: string, config: Record<string, unknown>): Promise<Plugin> {
    const plugin = await this.repository.findById(pluginId);
    if (!plugin) {
      throw new Error(`Plugin ${pluginId} not found`);
    }

    plugin.updateConfig(config);
    await this.repository.save(plugin);
    this.emit('config-updated', plugin);
    return plugin;
  }

  async getStatus(pluginId: string): Promise<PluginStatus> {
    const plugin = await this.repository.findById(pluginId);
    if (!plugin) {
      throw new Error(`Plugin ${pluginId} not found`);
    }
    return plugin.status;
  }

  async listByStatus(status: PluginStatus): Promise<Plugin[]> {
    return this.repository.findByStatus(status);
  }

  async getAll(): Promise<Plugin[]> {
    return this.repository.findAll();
  }
}

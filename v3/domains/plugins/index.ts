/**
 * Plugin Domain Export - ADR-004
 *
 * Main export point for plugin architecture
 */

export { Plugin, PluginStatus, PluginType } from './domain/entities/Plugin';
export { PluginManifest, validatePluginManifest } from './domain/entities/PluginManifest';
export { PluginRepository } from './domain/repositories/PluginRepository';
export { PluginLoader, PluginLoadOptions } from './application/services/PluginLoader';
export { PluginLifecycleManager, LifecycleOptions } from './application/services/PluginLifecycleManager';
export { PluginMarketplace, MarketplacePlugin, MarketplaceSearchOptions } from './application/services/PluginMarketplace';
export { PluginSandbox, createSandbox, SandboxOptions } from './infrastructure/PluginSandbox';
export { SqlitePluginRepository } from './infrastructure/SqlitePluginRepository';

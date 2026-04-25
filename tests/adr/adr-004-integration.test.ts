/**
 * ADR-004: Plugin-based Architecture - Integration Tests
 */

import { describe, it, expect } from 'vitest';

describe('ADR-004: Plugin-based Architecture', () => {
  it('should have plugin domain structure', async () => {
    const { Plugin } = await import('../../../v3/domains/plugins/domain/entities/Plugin');
    expect(Plugin).toBeDefined();
  });

  it('should create plugin instance', async () => {
    const { Plugin, PluginType } = await import('../../../v3/domains/plugins/domain/entities/Plugin');

    const plugin = new Plugin(
      'test-plugin@1.0.0',
      {
        name: 'test-plugin',
        version: '1.0.0',
        description: 'Test plugin',
        author: 'Test Author',
        type: PluginType.CUSTOM
      },
      {
        provides: ['test-capability'],
        consumes: []
      }
    );

    expect(plugin.id).toBe('test-plugin@1.0.0');
    expect(plugin.metadata.name).toBe('test-plugin');
  });

  it('should activate and deactivate plugin', async () => {
    const { Plugin, PluginStatus, PluginType } = await import('../../../v3/domains/plugins/domain/entities/Plugin');

    const plugin = new Plugin(
      'test-plugin@1.0.0',
      {
        name: 'test-plugin',
        version: '1.0.0',
        description: 'Test plugin',
        author: 'Test Author',
        type: PluginType.CUSTOM
      },
      {
        provides: ['test-capability'],
        consumes: []
      }
    );

    plugin.activate();
    expect(plugin.status).toBe(PluginStatus.ACTIVATED);

    plugin.deactivate();
    expect(plugin.status).toBe(PluginStatus.DEACTIVATED);
  });

  it('should have plugin sandbox', async () => {
    const { PluginSandbox } = await import('../../../v3/domains/plugins/infrastructure/PluginSandbox');

    const sandbox = new PluginSandbox();
    const result = sandbox.execute('1 + 1');

    expect(result).toBe(2);
  });

  it('should have plugin marketplace', async () => {
    const { PluginMarketplace } = await import('../../../v3/domains/plugins/application/services/PluginMarketplace');

    const marketplace = new PluginMarketplace();
    const results = await marketplace.search({ limit: 5 });

    expect(Array.isArray(results)).toBe(true);
  });

  it('should have plugin lifecycle manager', async () => {
    const { PluginLifecycleManager } = await import('../../../v3/domains/plugins/application/services/PluginLifecycleManager');
    const { SqlitePluginRepository } = await import('../../../v3/domains/plugins/infrastructure/SqlitePluginRepository');
    const { PluginLoader } = await import('../../../v3/domains/plugins/application/services/PluginLoader');

    const repository = new SqlitePluginRepository(':memory:');
    const loader = new PluginLoader();
    const lifecycle = new PluginLifecycleManager(repository, loader);

    expect(lifecycle).toBeDefined();
    expect(lifecycle.getAll()).resolves.toBeDefined();
  });
});

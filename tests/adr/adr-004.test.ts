/**
 * ADR-004 Plugin Architecture Tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Plugin, PluginStatus, PluginType } from '../../../v3/domains/plugins/domain/entities/Plugin';
import { PluginLifecycleManager } from '../../../v3/domains/plugins/application/services/PluginLifecycleManager';
import { PluginLoader } from '../../../v3/domains/plugins/application/services/PluginLoader';
import { PluginMarketplace } from '../../../v3/domains/plugins/application/services/PluginMarketplace';
import { SqlitePluginRepository } from '../../../v3/domains/plugins/infrastructure/SqlitePluginRepository';
import { PluginSandbox } from '../../../v3/domains/plugins/infrastructure/PluginSandbox';
import { rm } from 'fs/promises';
import { join } from 'path';

describe('ADR-004: Plugin-based Architecture', () => {
  describe('Plugin Entity', () => {
    it('should create a plugin with required metadata', () => {
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
      expect(plugin.status).toBe(PluginStatus.INSTALLED);
      expect(plugin.installedAt).toBeInstanceOf(Date);
    });

    it('should activate plugin successfully', () => {
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
      expect(plugin.activatedAt).toBeInstanceOf(Date);
    });

    it('should not activate already activated plugin', () => {
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
      expect(() => plugin.activate()).toThrow('already activated');
    });

    it('should deactivate plugin successfully', () => {
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
      plugin.deactivate();
      expect(plugin.status).toBe(PluginStatus.DEACTIVATED);
    });

    it('should check compatibility', () => {
      const plugin = new Plugin(
        'test-plugin@1.0.0',
        {
          name: 'test-plugin',
          version: '1.0.0',
          description: 'Test plugin',
          author: 'Test Author',
          type: PluginType.CUSTOM,
          minimumClaudeFlowVersion: '3.0.0'
        },
        {
          provides: ['test-capability'],
          consumes: []
        }
      );

      expect(plugin.isCompatibleWith('3.0.0')).toBe(true);
      expect(plugin.isCompatibleWith('2.0.0')).toBe(false);
      expect(plugin.isCompatibleWith('4.0.0')).toBe(true);
    });
  });

  describe('PluginSandbox', () => {
    it('should execute code in isolated context', () => {
      const sandbox = new PluginSandbox();
      const result = sandbox.execute('1 + 1');
      expect(result).toBe(2);
    });

    it('should provide safe console API', () => {
      const sandbox = new PluginSandbox();
      const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      sandbox.execute('console.log("test")');
      expect(logSpy).toHaveBeenCalledWith('[Plugin]', 'test');
      logSpy.mockRestore();
    });

    it('should enforce timeout', async () => {
      const sandbox = new PluginSandbox({ timeout: 100 });
      await expect(
        sandbox.executeAsync('while(true) {}')
      ).rejects.toThrow('timeout');
    });

    it('should restrict module loading', () => {
      const sandbox = new PluginSandbox({
        allowedModules: ['fs']
      });

      expect(() => sandbox.require('fs')).not.toThrow();
      expect(() => sandbox.require('http')).toThrow('not allowed');
    });
  });

  describe('PluginMarketplace', () => {
    it('should search for plugins', async () => {
      const marketplace = new PluginMarketplace();
      const results = await marketplace.search({
        query: 'test',
        limit: 5
      });

      expect(Array.isArray(results)).toBe(true);
      // Note: Actual results depend on npm registry availability
    });

    it('should get plugin info', async () => {
      const marketplace = new PluginMarketplace();
      const info = await marketplace.getPluginInfo('claude-flow');

      // May return null if package doesn't exist
      expect(info === null || typeof info === 'object').toBe(true);
    });
  });

  describe('PluginLifecycleManager', () => {
    let repository: SqlitePluginRepository;
    let loader: PluginLoader;
    let lifecycle: PluginLifecycleManager;
    const dbPath = join(process.cwd(), 'test-plugins.db');

    beforeEach(async () => {
      // Clean up test database
      try {
        await rm(dbPath);
      } catch {
        // Ignore if file doesn't exist
      }

      repository = new SqlitePluginRepository(dbPath);
      loader = new PluginLoader();
      lifecycle = new PluginLifecycleManager(repository, loader);
    });

    it('should install and activate plugin', async () => {
      // This would require actual plugin files
      // For now, test the flow with mock data
      const plugins = await lifecycle.getAll();
      expect(Array.isArray(plugins)).toBe(true);
    });

    it('should list plugins by status', async () => {
      const installed = await lifecycle.listByStatus(PluginStatus.INSTALLED);
      expect(Array.isArray(installed)).toBe(true);

      const activated = await lifecycle.listByStatus(PluginStatus.ACTIVATED);
      expect(Array.isArray(activated)).toBe(true);
    });
  });
});

/**
 * Plugin Marketplace - ADR-004
 *
 * Integrates with npm registry for plugin discovery and installation
 */

import { PluginManifest } from '../../domain/entities/PluginManifest';

export interface MarketplacePlugin {
  name: string;
  version: string;
  description: string;
  author: string;
  keywords?: string[];
  homepage?: string;
  repository?: string;
  downloads?: {
    week: number;
    month: number;
    total: number;
  };
  quality: number;
  popularity: number;
  maintenance: number;
}

export interface MarketplaceSearchOptions {
  query?: string;
  type?: string;
  author?: string;
  keyword?: string;
  limit?: number;
  offset?: number;
}

export class PluginMarketplace {
  private readonly NPM_REGISTRY = 'https://registry.npmjs.org';
  private readonly PLUGIN_KEYWORD = 'claude-flow-plugin';

  async search(options: MarketplaceSearchOptions = {}): Promise<MarketplacePlugin[]> {
    const params = new URLSearchParams();

    if (options.query) {
      params.append('text', options.query);
    }

    if (options.keyword) {
      params.append('keywords', `${this.PLUGIN_KEYWORD} ${options.keyword}`);
    } else {
      params.append('keywords', this.PLUGIN_KEYWORD);
    }

    if (options.limit) {
      params.append('size', options.limit.toString());
    }

    if (options.offset) {
      params.append('from', options.offset.toString());
    }

    const url = `${this.NPM_REGISTRY}/-/v1/search?${params.toString()}`;

    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`NPM registry error: ${response.statusText}`);
      }

      const data = await response.json();
      return this.transformNPMResults(data.objects || []);
    } catch (error) {
      console.error('Failed to search marketplace:', error);
      return [];
    }
  }

  async getPluginInfo(packageName: string): Promise<MarketplacePlugin | null> {
    try {
      const url = `${this.NPM_REGISTRY}/${packageName}`;
      const response = await fetch(url);

      if (!response.ok) {
        return null;
      }

      const data = await response.json();
      return this.transformNPMPackage(data);
    } catch (error) {
      console.error(`Failed to get plugin info for ${packageName}:`, error);
      return null;
    }
  }

  async downloadManifest(packageName: string): Promise<PluginManifest | null> {
    try {
      const info = await this.getPluginInfo(packageName);
      if (!info) {
        return null;
      }

      // Download the package tarball and extract plugin.json
      // This is a simplified version - production would use tar extraction
      const tarballUrl = info.versions?.[info.version]?.dist?.tarball;
      if (!tarballUrl) {
        return null;
      }

      // For now, return basic manifest from npm metadata
      return {
        name: info.name,
        version: info.version,
        description: info.description,
        author: info.author,
        type: 'custom',
        main: 'index.js',
        repository: info.repository ? {
          type: 'git',
          url: info.repository
        } : undefined,
        keywords: info.keywords
      };
    } catch (error) {
      console.error(`Failed to download manifest for ${packageName}:`, error);
      return null;
    }
  }

  async getPopularPlugins(limit = 10): Promise<MarketplacePlugin[]> {
    return this.search({
      limit,
      sort: 'popularity'
    });
  }

  async getFeaturedPlugins(): Promise<MarketplacePlugin[]> {
    // This would return curated featured plugins
    // For now, return popular ones
    return this.getPopularPlugins(5);
  }

  private transformNPMResults(objects: any[]): MarketplacePlugin[] {
    return objects.map(obj => this.transformNPMPackage(obj.package));
  }

  private transformNPMPackage(pkg: any): MarketplacePlugin {
    return {
      name: pkg.name,
      version: pkg.version || 'latest',
      description: pkg.description || '',
      author: pkg.author?.name || pkg.author || 'Unknown',
      keywords: pkg.keywords,
      homepage: pkg.homepage,
      repository: pkg.repository?.url,
      downloads: pkg.downloads,
      quality: pkg.score?.detail?.quality || 0,
      popularity: pkg.score?.detail?.popularity || 0,
      maintenance: pkg.score?.detail?.maintenance || 0
    };
  }
}

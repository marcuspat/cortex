/**
 * Plugin Entity - ADR-004
 *
 * Represents a plugin in the plugin system with lifecycle management
 */

export enum PluginStatus {
  INSTALLED = 'installed',
  ACTIVATED = 'activated',
  DEACTIVATED = 'deactivated',
  UNINSTALLED = 'uninstalled',
  ERROR = 'error'
}

export enum PluginType {
  COORDINATION = 'coordination',
  MEMORY = 'memory',
  MCP = 'mcp',
  UI = 'ui',
  CUSTOM = 'custom'
}

export interface PluginMetadata {
  name: string;
  version: string;
  description: string;
  author: string;
  type: PluginType;
  dependencies?: string[];
  permissions?: string[];
  minimumClaudeFlowVersion?: string;
}

export interface PluginCapabilities {
  provides: string[];
  consumes: string[];
  hooks?: string[];
}

export class Plugin {
  public readonly id: string;
  public readonly metadata: PluginMetadata;
  public readonly capabilities: PluginCapabilities;
  public status: PluginStatus;
  public installedAt: Date;
  public activatedAt?: Date;
  public lastError?: Error;
  public config: Record<string, unknown>;

  constructor(
    id: string,
    metadata: PluginMetadata,
    capabilities: PluginCapabilities,
    config: Record<string, unknown> = {}
  ) {
    this.id = id;
    this.metadata = metadata;
    this.capabilities = capabilities;
    this.status = PluginStatus.INSTALLED;
    this.installedAt = new Date();
    this.config = config;
  }

  activate(): void {
    if (this.status === PluginStatus.ACTIVATED) {
      throw new Error(`Plugin ${this.id} is already activated`);
    }
    this.status = PluginStatus.ACTIVATED;
    this.activatedAt = new Date();
  }

  deactivate(): void {
    if (this.status !== PluginStatus.ACTIVATED) {
      throw new Error(`Plugin ${this.id} is not activated`);
    }
    this.status = PluginStatus.DEACTIVATED;
  }

  uninstall(): void {
    if (this.status === PluginStatus.ACTIVATED) {
      throw new Error(`Plugin ${this.id} must be deactivated before uninstalling`);
    }
    this.status = PluginStatus.UNINSTALLED;
  }

  setError(error: Error): void {
    this.status = PluginStatus.ERROR;
    this.lastError = error;
  }

  updateConfig(config: Record<string, unknown>): void {
    this.config = { ...this.config, ...config };
  }

  isCompatibleWith(version: string): boolean {
    if (!this.metadata.minimumClaudeFlowVersion) {
      return true;
    }
    // Simple version comparison (can be enhanced with semver)
    return version >= this.metadata.minimumClaudeFlowVersion;
  }

  hasPermission(permission: string): boolean {
    return this.metadata.permissions?.includes(permission) ?? false;
  }

  toJSON() {
    return {
      id: this.id,
      metadata: this.metadata,
      capabilities: this.capabilities,
      status: this.status,
      installedAt: this.installedAt,
      activatedAt: this.activatedAt,
      config: this.config,
      lastError: this.lastError?.message
    };
  }
}

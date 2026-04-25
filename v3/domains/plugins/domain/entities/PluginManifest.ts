/**
 * Plugin Manifest - ADR-004
 *
 * Defines the structure of a plugin manifest file (plugin.json)
 */

export interface PluginManifest {
  $schema?: string;
  name: string;
  version: string;
  description: string;
  author: string;
  license?: string;
  type: string;
  main: string;
  dependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
  permissions?: string[];
  capabilities?: {
    provides?: string[];
    consumes?: string[];
    hooks?: string[];
  };
  config?: Record<string, unknown>;
  minimumClaudeFlowVersion?: string;
  repository?: {
    type: string;
    url: string;
  };
  keywords?: string[];
  bugs?: {
    url: string;
    email?: string;
  };
  homepage?: string;
}

export function validatePluginManifest(manifest: unknown): manifest is PluginManifest {
  if (typeof manifest !== 'object' || manifest === null) {
    return false;
  }

  const required = ['name', 'version', 'description', 'author', 'type', 'main'];
  for (const field of required) {
    if (!(field in manifest)) {
      return false;
    }
  }

  return true;
}

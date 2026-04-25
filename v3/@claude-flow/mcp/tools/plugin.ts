/**
 * ADR-005: MCP Tools - Plugin management
 */

export const pluginInstallTool = {
  name: 'plugin_install',
  description: 'Install a plugin from the marketplace',
  inputSchema: {
    type: 'object',
    properties: {
      pluginId: { type: 'string', description: 'Plugin identifier' },
      version: { type: 'string', description: 'Version to install (optional)' },
    },
    required: ['pluginId'],
  },
};

export const pluginListTool = {
  name: 'plugin_list',
  description: 'List all installed plugins',
  inputSchema: {
    type: 'object',
    properties: {
      status: { type: 'string', description: 'Filter by status' },
    },
  },
};

export const pluginActivateTool = {
  name: 'plugin_activate',
  description: 'Activate an installed plugin',
  inputSchema: {
    type: 'object',
    properties: {
      pluginId: { type: 'string', description: 'Plugin identifier' },
    },
    required: ['pluginId'],
  },
};

export const pluginDeactivateTool = {
  name: 'plugin_deactivate',
  description: 'Deactivate an active plugin',
  inputSchema: {
    type: 'object',
    properties: {
      pluginId: { type: 'string', description: 'Plugin identifier' },
    },
    required: ['pluginId'],
  },
};

export const pluginUninstallTool = {
  name: 'plugin_uninstall',
  description: 'Uninstall a plugin',
  inputSchema: {
    type: 'object',
    properties: {
      pluginId: { type: 'string', description: 'Plugin identifier' },
    },
    required: ['pluginId'],
  },
};

// Tool registration helper
export function registerPluginTools(register: (tool: any) => void) {
  register(pluginInstallTool);
  register(pluginListTool);
  register(pluginActivateTool);
  register(pluginDeactivateTool);
  register(pluginUninstallTool);
}

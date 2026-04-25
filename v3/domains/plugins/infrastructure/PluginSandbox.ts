/**
 * Plugin Sandbox - ADR-004
 *
 * Provides secure isolation for plugin execution
 */

import { vm } from 'vm';
import { runInNewContext } from 'vm';

export interface SandboxOptions {
  timeout?: number;
  memoryLimit?: number;
  allowedModules?: string[];
  expose?: Record<string, unknown>;
}

export class PluginSandbox {
  private context: vm.Context;
  private readonly timeout: number;
  private readonly memoryLimit: number;
  private readonly allowedModules: Set<string>;

  constructor(options: SandboxOptions = {}) {
    this.timeout = options.timeout || 5000; // 5 seconds default
    this.memoryLimit = options.memoryLimit || 100 * 1024 * 1024; // 100MB default
    this.allowedModules = new Set(options.allowedModules || []);

    this.context = this.createContext(options.expose || {});
  }

  private createContext(expose: Record<string, unknown>): vm.Context {
    const context = {
      // Safe globals
      console: {
        log: (...args: unknown[]) => console.log('[Plugin]', ...args),
        warn: (...args: unknown[]) => console.warn('[Plugin]', ...args),
        error: (...args: unknown[]) => console.error('[Plugin]', ...args)
      },
      setTimeout: setTimeout.bind(global),
      clearTimeout: clearTimeout.bind(global),
      setInterval: setInterval.bind(global),
      clearInterval: clearInterval.bind(global),
      Promise,
      Date,
      Math,
      JSON,
      Object,
      Array,
      String,
      Number,
      Boolean,

      // Exposed APIs
      ...expose
    };

    return vm.createContext(context);
  }

  execute(code: string, filename = 'sandbox'): unknown {
    try {
      const script = new vm.Script(code, { filename });
      const result = script.runInContext(this.context, {
        timeout: this.timeout,
        displayErrors: true
      });
      return result;
    } catch (error) {
      console.error(`Sandbox execution error in ${filename}:`, error);
      throw error;
    }
  }

  executeAsync(code: string, filename = 'sandbox'): Promise<unknown> {
    return new Promise((resolve, reject) => {
      try {
        const wrappedCode = `
          (async () => {
            ${code}
          })()
        `;
        const script = new vm.Script(wrappedCode, { filename });

        // Set up timeout
        const timeoutId = setTimeout(() => {
          reject(new Error(`Sandbox execution timeout in ${filename}`));
        }, this.timeout);

        script.runInContext(this.context, {
          timeout: this.timeout,
          displayErrors: true
        }).then((result: unknown) => {
          clearTimeout(timeoutId);
          resolve(result);
        }).catch((error: Error) => {
          clearTimeout(timeoutId);
          reject(error);
        });
      } catch (error) {
        reject(error);
      }
    });
  }

  require(moduleName: string): unknown {
    if (!this.allowedModules.has(moduleName)) {
      throw new Error(`Module '${moduleName}' is not allowed in sandbox`);
    }

    // In production, this would load the module in a restricted way
    // For now, just check if it's allowed
    return require(moduleName);
  }

  expose(key: string, value: unknown): void {
    this.context[key] = value;
  }

  reset(expose?: Record<string, unknown>): void {
    this.context = this.createContext(expose || {});
  }
}

export function createSandbox(options?: SandboxOptions): PluginSandbox {
  return new PluginSandbox(options);
}

/**
 * Plugin system for HyperSim SDK
 * Provides extensible architecture for adding custom functionality
 */

import { Plugin, PluginHook } from '../types/common.js';
import { PluginError, ValidationError } from '../core/errors.js';
import { validatePluginName } from '../utils/validators.js';

/**
 * Plugin lifecycle states
 */
type PluginState = 'unloaded' | 'loading' | 'loaded' | 'error';

/**
 * Plugin registry entry
 */
interface PluginEntry {
  plugin: Plugin;
  state: PluginState;
  error?: Error;
  loadedAt?: Date;
}

/**
 * Plugin manager for handling plugin lifecycle
 */
export class PluginManager {
  private plugins: Map<string, PluginEntry> = new Map();
  private hooks: Map<string, PluginHook[]> = new Map();
  private globalState: Record<string, any> = {};

  /**
   * Register a plugin
   */
  public register(plugin: Plugin): void {
    if (!validatePluginName(plugin.name)) {
      throw new ValidationError(
        'Invalid plugin name. Must contain only letters, numbers, hyphens, and underscores.',
        'name',
        plugin.name
      );
    }

    if (this.plugins.has(plugin.name)) {
      throw new PluginError(
        `Plugin '${plugin.name}' is already registered`,
        plugin.name,
        plugin.version
      );
    }

    this.plugins.set(plugin.name, {
      plugin,
      state: 'unloaded'
    });
  }

  /**
   * Load and initialize a plugin
   */
  public async load(pluginName: string): Promise<void> {
    const entry = this.plugins.get(pluginName);
    if (!entry) {
      throw new PluginError(`Plugin '${pluginName}' not found`);
    }

    if (entry.state === 'loaded') {
      return; // Already loaded
    }

    if (entry.state === 'loading') {
      throw new PluginError(`Plugin '${pluginName}' is already being loaded`);
    }

    entry.state = 'loading';

    try {
      // Initialize plugin if it has an initialize method
      if (entry.plugin.initialize) {
        await entry.plugin.initialize(this.createPluginContext(entry.plugin));
      }

      entry.state = 'loaded';
      entry.loadedAt = new Date();
      entry.error = undefined;

      console.log(`Plugin '${pluginName}' loaded successfully`);
    } catch (error) {
      entry.state = 'error';
      entry.error = error instanceof Error ? error : new Error(String(error));
      
      throw new PluginError(
        `Failed to load plugin '${pluginName}': ${entry.error.message}`,
        pluginName,
        entry.plugin.version,
        { originalError: error }
      );
    }
  }

  /**
   * Apply plugin hooks for a specific phase
   */
  public async apply(
    phase: 'before-request' | 'after-response' | 'on-error',
    context: any,
    data: any
  ): Promise<any> {
    const hooks = this.hooks.get(phase) || [];
    let currentData = data;

    for (const hook of hooks) {
      try {
        const result = await hook.handler(context, currentData);
        if (result !== undefined) {
          currentData = result;
        }
      } catch (error) {
        console.error(`Plugin hook '${hook.name}' failed:`, error);
        // Continue with other hooks
      }
    }

    return currentData;
  }

  /**
   * Get all plugins
   */
  public getAllPlugins(): Map<string, PluginEntry> {
    return new Map(this.plugins);
  }

  /**
   * Create plugin context for initialization
   */
  private createPluginContext(plugin: Plugin): any {
    return {
      pluginName: plugin.name,
      pluginVersion: plugin.version,
      log: (message: string) => console.log(`[${plugin.name}] ${message}`)
    };
  }
}
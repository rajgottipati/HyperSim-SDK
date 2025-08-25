/**
 * Plugin system foundation for extensibility
 */

import { EventEmitter } from 'events';
import { ValidationError, ConfigurationError } from '../types/errors';

/**
 * Plugin hook types
 */
export type HookType = 
  | 'before-request'
  | 'after-response'
  | 'before-simulation'
  | 'after-simulation'
  | 'before-ai-analysis'
  | 'after-ai-analysis'
  | 'on-error'
  | 'on-connect'
  | 'on-disconnect';

/**
 * Hook context interface
 */
export interface HookContext {
  /** Unique request ID */
  requestId: string;
  /** Timestamp */
  timestamp: number;
  /** Additional data specific to the hook */
  data?: any;
  /** Whether to halt execution */
  halt?: boolean;
  /** Modified data to pass to next hook */
  modifiedData?: any;
}

/**
 * Plugin hook function signature
 */
export type HookFunction = (context: HookContext, ...args: any[]) => Promise<HookContext | void> | HookContext | void;

/**
 * Plugin interface
 */
export interface Plugin {
  /** Plugin name */
  name: string;
  /** Plugin version */
  version: string;
  /** Plugin description */
  description?: string;
  /** Plugin initialization function */
  initialize?: (system: PluginSystem) => Promise<void> | void;
  /** Plugin cleanup function */
  cleanup?: () => Promise<void> | void;
  /** Plugin hooks */
  hooks?: Record<HookType, HookFunction>;
}

/**
 * Plugin configuration
 */
export interface PluginConfig {
  /** Plugin instance */
  plugin: Plugin;
  /** Plugin-specific configuration */
  config?: Record<string, any>;
  /** Plugin priority (lower number = higher priority) */
  priority?: number;
  /** Whether plugin is enabled */
  enabled?: boolean;
}

/**
 * Middleware function signature
 */
export type MiddlewareFunction = (context: any, next: () => Promise<void>) => Promise<void>;

/**
 * Plugin system for extensibility and middleware
 */
export class PluginSystem extends EventEmitter {
  private plugins = new Map<string, PluginConfig>();
  private hooks = new Map<HookType, Array<{ plugin: string; func: HookFunction; priority: number }>>>();
  private middlewares: Array<{ func: MiddlewareFunction; priority: number }> = [];
  private initialized = false;
  private debug: boolean;

  constructor(options: { debug?: boolean } = {}) {
    super();
    this.debug = options.debug || false;

    if (this.debug) {
      console.log('[Plugin System] Initialized');
    }
  }

  /**
   * Register a plugin
   */
  async registerPlugin(config: PluginConfig): Promise<void> {
    const { plugin } = config;
    
    if (!plugin.name) {
      throw new ValidationError('Plugin name is required');
    }

    if (this.plugins.has(plugin.name)) {
      throw new ConfigurationError(`Plugin '${plugin.name}' is already registered`);
    }

    // Set default values
    const pluginConfig: Required<PluginConfig> = {
      plugin,
      config: config.config || {},
      priority: config.priority || 10,
      enabled: config.enabled !== false
    };

    this.plugins.set(plugin.name, pluginConfig);

    // Register hooks if plugin is enabled
    if (pluginConfig.enabled && plugin.hooks) {
      this.registerHooks(plugin.name, plugin.hooks, pluginConfig.priority);
    }

    // Initialize plugin if the system is already initialized
    if (this.initialized && pluginConfig.enabled && plugin.initialize) {
      await plugin.initialize(this);
    }

    this.emit('pluginRegistered', plugin.name);

    if (this.debug) {
      console.log(`[Plugin System] Registered plugin: ${plugin.name}`);
    }
  }

  /**
   * Unregister a plugin
   */
  async unregisterPlugin(name: string): Promise<void> {
    const pluginConfig = this.plugins.get(name);
    if (!pluginConfig) {
      throw new ValidationError(`Plugin '${name}' is not registered`);
    }

    // Cleanup plugin
    if (pluginConfig.plugin.cleanup) {
      await pluginConfig.plugin.cleanup();
    }

    // Remove hooks
    this.unregisterHooks(name);

    // Remove plugin
    this.plugins.delete(name);

    this.emit('pluginUnregistered', name);

    if (this.debug) {
      console.log(`[Plugin System] Unregistered plugin: ${name}`);
    }
  }

  /**
   * Enable a plugin
   */
  async enablePlugin(name: string): Promise<void> {
    const pluginConfig = this.plugins.get(name);
    if (!pluginConfig) {
      throw new ValidationError(`Plugin '${name}' is not registered`);
    }

    if (pluginConfig.enabled) {
      return; // Already enabled
    }

    pluginConfig.enabled = true;

    // Register hooks
    if (pluginConfig.plugin.hooks) {
      this.registerHooks(name, pluginConfig.plugin.hooks, pluginConfig.priority);
    }

    // Initialize if system is initialized
    if (this.initialized && pluginConfig.plugin.initialize) {
      await pluginConfig.plugin.initialize(this);
    }

    this.emit('pluginEnabled', name);

    if (this.debug) {
      console.log(`[Plugin System] Enabled plugin: ${name}`);
    }
  }

  /**
   * Disable a plugin
   */
  async disablePlugin(name: string): Promise<void> {
    const pluginConfig = this.plugins.get(name);
    if (!pluginConfig) {
      throw new ValidationError(`Plugin '${name}' is not registered`);
    }

    if (!pluginConfig.enabled) {
      return; // Already disabled
    }

    pluginConfig.enabled = false;

    // Cleanup plugin
    if (pluginConfig.plugin.cleanup) {
      await pluginConfig.plugin.cleanup();
    }

    // Remove hooks
    this.unregisterHooks(name);

    this.emit('pluginDisabled', name);

    if (this.debug) {
      console.log(`[Plugin System] Disabled plugin: ${name}`);
    }
  }

  /**
   * Execute hooks for a specific type
   */
  async executeHooks(hookType: HookType, context: HookContext, ...args: any[]): Promise<HookContext> {
    const hooks = this.hooks.get(hookType) || [];
    
    if (hooks.length === 0) {
      return context;
    }

    // Sort hooks by priority
    const sortedHooks = [...hooks].sort((a, b) => a.priority - b.priority);

    let currentContext = { ...context };

    for (const hook of sortedHooks) {
      try {
        const result = await hook.func(currentContext, ...args);
        
        if (result) {
          currentContext = { ...currentContext, ...result };
        }

        // Check if execution should be halted
        if (currentContext.halt) {
          if (this.debug) {
            console.log(`[Plugin System] Hook execution halted by plugin: ${hook.plugin}`);
          }
          break;
        }
      } catch (error) {
        console.error(`[Plugin System] Hook error in plugin '${hook.plugin}':`, error);
        this.emit('hookError', { plugin: hook.plugin, hookType, error });
      }
    }

    return currentContext;
  }

  /**
   * Add middleware function
   */
  addMiddleware(middleware: MiddlewareFunction, priority: number = 10): void {
    this.middlewares.push({ func: middleware, priority });
    this.middlewares.sort((a, b) => a.priority - b.priority);

    if (this.debug) {
      console.log(`[Plugin System] Added middleware with priority: ${priority}`);
    }
  }

  /**
   * Execute middleware chain
   */
  async executeMiddleware(context: any): Promise<void> {
    let index = 0;

    const next = async (): Promise<void> => {
      if (index >= this.middlewares.length) {
        return;
      }

      const middleware = this.middlewares[index++];
      await middleware.func(context, next);
    };

    await next();
  }

  /**
   * Initialize the plugin system
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    this.initialized = true;

    // Initialize all enabled plugins
    for (const [name, config] of this.plugins) {
      if (config.enabled && config.plugin.initialize) {
        try {
          await config.plugin.initialize(this);
        } catch (error) {
          console.error(`[Plugin System] Failed to initialize plugin '${name}':`, error);
          this.emit('pluginInitializationError', { plugin: name, error });
        }
      }
    }

    this.emit('initialized');

    if (this.debug) {
      console.log('[Plugin System] Initialized all plugins');
    }
  }

  /**
   * Shutdown the plugin system
   */
  async shutdown(): Promise<void> {
    if (!this.initialized) {
      return;
    }

    this.initialized = false;

    // Cleanup all plugins
    for (const [name, config] of this.plugins) {
      if (config.plugin.cleanup) {
        try {
          await config.plugin.cleanup();
        } catch (error) {
          console.error(`[Plugin System] Failed to cleanup plugin '${name}':`, error);
        }
      }
    }

    this.plugins.clear();
    this.hooks.clear();
    this.middlewares = [];

    this.emit('shutdown');

    if (this.debug) {
      console.log('[Plugin System] Shut down');
    }
  }

  /**
   * Register hooks for a plugin
   */
  private registerHooks(pluginName: string, hooks: Record<HookType, HookFunction>, priority: number): void {
    for (const [hookType, func] of Object.entries(hooks)) {
      const hookTypeKey = hookType as HookType;
      
      if (!this.hooks.has(hookTypeKey)) {
        this.hooks.set(hookTypeKey, []);
      }

      this.hooks.get(hookTypeKey)!.push({ plugin: pluginName, func, priority });
    }
  }

  /**
   * Unregister all hooks for a plugin
   */
  private unregisterHooks(pluginName: string): void {
    for (const [hookType, hooks] of this.hooks) {
      this.hooks.set(
        hookType,
        hooks.filter(hook => hook.plugin !== pluginName)
      );
    }
  }

  /**
   * Get registered plugins
   */
  getPlugins(): Array<{ name: string; enabled: boolean; version: string }> {
    return Array.from(this.plugins.values()).map(config => ({
      name: config.plugin.name,
      enabled: config.enabled,
      version: config.plugin.version
    }));
  }

  /**
   * Check if plugin is registered
   */
  hasPlugin(name: string): boolean {
    return this.plugins.has(name);
  }

  /**
   * Check if plugin is enabled
   */
  isPluginEnabled(name: string): boolean {
    const config = this.plugins.get(name);
    return config ? config.enabled : false;
  }

  /**
   * Get plugin configuration
   */
  getPluginConfig(name: string): PluginConfig | undefined {
    return this.plugins.get(name);
  }
}
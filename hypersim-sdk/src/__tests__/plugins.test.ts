/**
 * Tests for Plugin System
 */

import { PluginSystem, Plugin, HookContext } from '../plugins/PluginSystem';
import { LoggingPlugin, MetricsPlugin, CachingPlugin } from '../plugins';

describe('PluginSystem', () => {
  let pluginSystem: PluginSystem;

  beforeEach(() => {
    pluginSystem = new PluginSystem({ debug: true });
  });

  afterEach(async () => {
    await pluginSystem.shutdown();
  });

  describe('Plugin registration', () => {
    it('should register and initialize plugins', async () => {
      const testPlugin: Plugin = {
        name: 'test-plugin',
        version: '1.0.0',
        description: 'Test plugin',
        initialize: jest.fn(),
        cleanup: jest.fn()
      };

      await pluginSystem.registerPlugin({
        plugin: testPlugin,
        enabled: true
      });

      await pluginSystem.initialize();

      expect(testPlugin.initialize).toHaveBeenCalledWith(pluginSystem);
      expect(pluginSystem.hasPlugin('test-plugin')).toBe(true);
      expect(pluginSystem.isPluginEnabled('test-plugin')).toBe(true);
    });

    it('should prevent duplicate plugin registration', async () => {
      const testPlugin: Plugin = {
        name: 'test-plugin',
        version: '1.0.0'
      };

      await pluginSystem.registerPlugin({ plugin: testPlugin });

      await expect(pluginSystem.registerPlugin({ plugin: testPlugin }))
        .rejects
        .toThrow('Plugin \'test-plugin\' is already registered');
    });

    it('should unregister plugins', async () => {
      const testPlugin: Plugin = {
        name: 'test-plugin',
        version: '1.0.0',
        cleanup: jest.fn()
      };

      await pluginSystem.registerPlugin({ plugin: testPlugin });
      expect(pluginSystem.hasPlugin('test-plugin')).toBe(true);

      await pluginSystem.unregisterPlugin('test-plugin');
      expect(pluginSystem.hasPlugin('test-plugin')).toBe(false);
      expect(testPlugin.cleanup).toHaveBeenCalled();
    });
  });

  describe('Plugin enable/disable', () => {
    it('should enable and disable plugins', async () => {
      const testPlugin: Plugin = {
        name: 'test-plugin',
        version: '1.0.0',
        initialize: jest.fn(),
        cleanup: jest.fn()
      };

      await pluginSystem.registerPlugin({ plugin: testPlugin, enabled: false });
      expect(pluginSystem.isPluginEnabled('test-plugin')).toBe(false);

      await pluginSystem.enablePlugin('test-plugin');
      expect(pluginSystem.isPluginEnabled('test-plugin')).toBe(true);

      await pluginSystem.disablePlugin('test-plugin');
      expect(pluginSystem.isPluginEnabled('test-plugin')).toBe(false);
      expect(testPlugin.cleanup).toHaveBeenCalled();
    });
  });

  describe('Hook execution', () => {
    it('should execute hooks in priority order', async () => {
      const executionOrder: string[] = [];

      const plugin1: Plugin = {
        name: 'plugin-1',
        version: '1.0.0',
        hooks: {
          'before-request': async (context: HookContext) => {
            executionOrder.push('plugin-1');
          }
        }
      };

      const plugin2: Plugin = {
        name: 'plugin-2',
        version: '1.0.0',
        hooks: {
          'before-request': async (context: HookContext) => {
            executionOrder.push('plugin-2');
          }
        }
      };

      await pluginSystem.registerPlugin({ plugin: plugin1, priority: 20 });
      await pluginSystem.registerPlugin({ plugin: plugin2, priority: 10 });

      const context: HookContext = {
        requestId: 'test-request',
        timestamp: Date.now()
      };

      await pluginSystem.executeHooks('before-request', context);

      expect(executionOrder).toEqual(['plugin-2', 'plugin-1']); // Lower priority executes first
    });

    it('should halt execution when hook returns halt=true', async () => {
      const executionOrder: string[] = [];

      const plugin1: Plugin = {
        name: 'plugin-1',
        version: '1.0.0',
        hooks: {
          'before-request': async (context: HookContext) => {
            executionOrder.push('plugin-1');
            return { ...context, halt: true };
          }
        }
      };

      const plugin2: Plugin = {
        name: 'plugin-2',
        version: '1.0.0',
        hooks: {
          'before-request': async (context: HookContext) => {
            executionOrder.push('plugin-2');
          }
        }
      };

      await pluginSystem.registerPlugin({ plugin: plugin1, priority: 10 });
      await pluginSystem.registerPlugin({ plugin: plugin2, priority: 20 });

      const context: HookContext = {
        requestId: 'test-request',
        timestamp: Date.now()
      };

      await pluginSystem.executeHooks('before-request', context);

      expect(executionOrder).toEqual(['plugin-1']); // plugin-2 should not execute
    });

    it('should handle hook errors gracefully', async () => {
      const plugin1: Plugin = {
        name: 'plugin-1',
        version: '1.0.0',
        hooks: {
          'before-request': async () => {
            throw new Error('Hook error');
          }
        }
      };

      await pluginSystem.registerPlugin({ plugin: plugin1 });

      const context: HookContext = {
        requestId: 'test-request',
        timestamp: Date.now()
      };

      // Should not throw, but continue execution
      await expect(pluginSystem.executeHooks('before-request', context))
        .resolves
        .toBeDefined();
    });
  });

  describe('Middleware execution', () => {
    it('should execute middleware in order', async () => {
      const executionOrder: string[] = [];

      const middleware1 = async (context: any, next: () => Promise<void>) => {
        executionOrder.push('middleware-1-start');
        await next();
        executionOrder.push('middleware-1-end');
      };

      const middleware2 = async (context: any, next: () => Promise<void>) => {
        executionOrder.push('middleware-2-start');
        await next();
        executionOrder.push('middleware-2-end');
      };

      pluginSystem.addMiddleware(middleware1, 10);
      pluginSystem.addMiddleware(middleware2, 20);

      await pluginSystem.executeMiddleware({});

      expect(executionOrder).toEqual([
        'middleware-1-start',
        'middleware-2-start',
        'middleware-2-end',
        'middleware-1-end'
      ]);
    });
  });

  describe('Built-in plugins', () => {
    it('should work with LoggingPlugin', async () => {
      const loggingPlugin = new LoggingPlugin({
        level: 'debug',
        includeData: true
      });

      await pluginSystem.registerPlugin({ plugin: loggingPlugin });
      await pluginSystem.initialize();

      expect(pluginSystem.hasPlugin('logging')).toBe(true);
    });

    it('should work with MetricsPlugin', async () => {
      const metricsPlugin = new MetricsPlugin({
        enabled: true,
        interval: 1000
      });

      await pluginSystem.registerPlugin({ plugin: metricsPlugin });
      await pluginSystem.initialize();

      expect(pluginSystem.hasPlugin('metrics')).toBe(true);
    });

    it('should work with CachingPlugin', async () => {
      const cachingPlugin = new CachingPlugin({
        enabled: true,
        defaultTtl: 300
      });

      await pluginSystem.registerPlugin({ plugin: cachingPlugin });
      await pluginSystem.initialize();

      expect(pluginSystem.hasPlugin('caching')).toBe(true);
    });
  });
});
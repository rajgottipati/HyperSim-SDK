/**
 * Middleware system for HyperSim SDK
 * Provides extensible request/response processing and cross-cutting concerns
 */

import { Plugin, PluginHook, RequestOptions, Response } from '../types/common.js';
import { HyperSimError } from '../core/errors.js';

/**
 * Middleware execution context
 */
export interface MiddlewareContext {
  operation: string;
  timestamp: number;
  requestId: string;
  metadata: Record<string, any>;
  state: Record<string, any>;
}

/**
 * Middleware function signature
 */
export type MiddlewareFunction<TInput = any, TOutput = any> = (
  input: TInput,
  context: MiddlewareContext,
  next: () => Promise<TOutput>
) => Promise<TOutput>;

/**
 * Request middleware for HTTP operations
 */
export type RequestMiddleware = MiddlewareFunction<RequestOptions, Response>;

/**
 * Response middleware for processing API responses
 */
export type ResponseMiddleware = MiddlewareFunction<Response, Response>;

/**
 * Error middleware for handling failures
 */
export type ErrorMiddleware = (
  error: Error,
  context: MiddlewareContext,
  retry: () => Promise<any>
) => Promise<any>;

/**
 * Middleware pipeline for processing requests and responses
 */
export class MiddlewarePipeline {
  private requestMiddleware: RequestMiddleware[] = [];
  private responseMiddleware: ResponseMiddleware[] = [];
  private errorMiddleware: ErrorMiddleware[] = [];
  private hooks: Map<string, PluginHook[]> = new Map();

  /**
   * Add request middleware
   */
  public useRequest(middleware: RequestMiddleware): void {
    this.requestMiddleware.push(middleware);
  }

  /**
   * Add response middleware
   */
  public useResponse(middleware: ResponseMiddleware): void {
    this.responseMiddleware.push(middleware);
  }

  /**
   * Add error middleware
   */
  public useError(middleware: ErrorMiddleware): void {
    this.errorMiddleware.push(middleware);
  }

  /**
   * Add plugin hook
   */
  public addHook(hook: PluginHook): void {
    if (!this.hooks.has(hook.phase)) {
      this.hooks.set(hook.phase, []);
    }
    const hooks = this.hooks.get(hook.phase)!;
    hooks.push(hook);
    hooks.sort((a, b) => (a.priority || 10) - (b.priority || 10));
  }

  /**
   * Execute request pipeline
   */
  public async executeRequest(
    options: RequestOptions,
    context: MiddlewareContext,
    finalHandler: (options: RequestOptions) => Promise<Response>
  ): Promise<Response> {
    let currentIndex = 0;

    const next = async (): Promise<Response> => {
      if (currentIndex >= this.requestMiddleware.length) {
        // Execute hooks before final request
        await this.executeHooks('before-request', context, options);
        
        try {
          const response = await finalHandler(options);
          
          // Execute hooks after response
          await this.executeHooks('after-response', context, response);
          
          return response;
        } catch (error) {
          // Execute error hooks
          await this.executeHooks('on-error', context, error);
          throw error;
        }
      }

      const middleware = this.requestMiddleware[currentIndex++];
      return middleware(options, context, next);
    };

    try {
      const response = await next();
      return await this.executeResponsePipeline(response, context);
    } catch (error) {
      return await this.executeErrorPipeline(error as Error, context, () => 
        this.executeRequest(options, context, finalHandler)
      );
    }
  }

  /**
   * Execute response pipeline
   */
  private async executeResponsePipeline(
    response: Response,
    context: MiddlewareContext
  ): Promise<Response> {
    let currentIndex = 0;
    let currentResponse = response;

    const next = async (): Promise<Response> => {
      if (currentIndex >= this.responseMiddleware.length) {
        return currentResponse;
      }

      const middleware = this.responseMiddleware[currentIndex++];
      currentResponse = await middleware(currentResponse, context, next);
      return currentResponse;
    };

    return next();
  }

  /**
   * Execute error pipeline
   */
  private async executeErrorPipeline(
    error: Error,
    context: MiddlewareContext,
    retry: () => Promise<Response>
  ): Promise<Response> {
    for (const middleware of this.errorMiddleware) {
      try {
        return await middleware(error, context, retry);
      } catch (middlewareError) {
        // Continue to next error middleware
        continue;
      }
    }

    // No error middleware handled the error, rethrow
    throw error;
  }

  /**
   * Execute plugin hooks
   */
  private async executeHooks(
    phase: string,
    context: MiddlewareContext,
    data: any
  ): Promise<void> {
    const hooks = this.hooks.get(phase) || [];
    
    for (const hook of hooks) {
      try {
        await hook.handler(context, data);
      } catch (error) {
        console.warn(`Hook ${hook.name} failed:`, error);
      }
    }
  }

  /**
   * Clear all middleware
   */
  public clear(): void {
    this.requestMiddleware = [];
    this.responseMiddleware = [];
    this.errorMiddleware = [];
    this.hooks.clear();
  }

  /**
   * Get middleware counts for debugging
   */
  public getStats(): {
    requestMiddleware: number;
    responseMiddleware: number;
    errorMiddleware: number;
    hooks: number;
  } {
    return {
      requestMiddleware: this.requestMiddleware.length,
      responseMiddleware: this.responseMiddleware.length,
      errorMiddleware: this.errorMiddleware.length,
      hooks: Array.from(this.hooks.values()).reduce((sum, hooks) => sum + hooks.length, 0)
    };
  }
}

/**
 * Built-in middleware functions
 */
export class BuiltInMiddleware {
  /**
   * Logging middleware
   */
  static logging(options: { enableRequest?: boolean; enableResponse?: boolean } = {}): {
    request: RequestMiddleware;
    response: ResponseMiddleware;
    error: ErrorMiddleware;
  } {
    const { enableRequest = true, enableResponse = true } = options;

    return {
      request: async (requestOptions, context, next) => {
        if (enableRequest) {
          console.log(`[${context.requestId}] ${context.operation} Request:`, {
            method: requestOptions.method,
            url: requestOptions.headers?.['url'] || 'N/A',
            timestamp: context.timestamp
          });
        }
        return next();
      },

      response: async (response, context, next) => {
        if (enableResponse) {
          console.log(`[${context.requestId}] ${context.operation} Response:`, {
            status: response.status,
            success: response.success,
            duration: Date.now() - context.timestamp
          });
        }
        return next();
      },

      error: async (error, context, retry) => {
        console.error(`[${context.requestId}] ${context.operation} Error:`, {
          error: error.message,
          duration: Date.now() - context.timestamp
        });
        throw error;
      }
    };
  }

  /**
   * Retry middleware with exponential backoff
   */
  static retry(options: {
    maxAttempts?: number;
    baseDelay?: number;
    maxDelay?: number;
    backoffMultiplier?: number;
    retryableErrors?: string[];
  } = {}): ErrorMiddleware {
    const {
      maxAttempts = 3,
      baseDelay = 1000,
      maxDelay = 30000,
      backoffMultiplier = 2,
      retryableErrors = ['NETWORK_ERROR', 'TIMEOUT', 'RATE_LIMIT']
    } = options;

    return async (error, context, retry) => {
      const attempt = context.metadata.retryAttempt || 0;
      
      if (attempt >= maxAttempts) {
        throw error;
      }

      // Check if error is retryable
      const isRetryable = retryableErrors.some(code => 
        error.message.includes(code) || (error as any).code === code
      );

      if (!isRetryable) {
        throw error;
      }

      // Calculate delay with exponential backoff
      const delay = Math.min(
        baseDelay * Math.pow(backoffMultiplier, attempt),
        maxDelay
      );

      // Add jitter to prevent thundering herd
      const jitteredDelay = delay * (0.5 + Math.random() * 0.5);

      console.log(`Retrying ${context.operation} (attempt ${attempt + 1}/${maxAttempts}) after ${jitteredDelay}ms`);
      
      await new Promise(resolve => setTimeout(resolve, jitteredDelay));
      
      // Update retry attempt in context
      context.metadata.retryAttempt = attempt + 1;
      
      return retry();
    };
  }

  /**
   * Rate limiting middleware
   */
  static rateLimit(options: {
    requestsPerSecond?: number;
    burstSize?: number;
    windowMs?: number;
  } = {}): RequestMiddleware {
    const {
      requestsPerSecond = 10,
      burstSize = 20,
      windowMs = 1000
    } = options;

    const tokens = burstSize;
    const refillRate = requestsPerSecond / (1000 / windowMs);
    let lastRefill = Date.now();
    let currentTokens = tokens;

    return async (requestOptions, context, next) => {
      const now = Date.now();
      const timePassed = now - lastRefill;
      const tokensToAdd = Math.floor(timePassed * refillRate);
      
      currentTokens = Math.min(tokens, currentTokens + tokensToAdd);
      lastRefill = now;

      if (currentTokens < 1) {
        const waitTime = (1 / refillRate) - (timePassed % (1 / refillRate));
        await new Promise(resolve => setTimeout(resolve, waitTime));
        currentTokens = 1;
      }

      currentTokens -= 1;
      return next();
    };
  }

  /**
   * Authentication middleware
   */
  static authentication(options: {
    getToken?: () => Promise<string>;
    headerName?: string;
    tokenPrefix?: string;
  } = {}): RequestMiddleware {
    const {
      getToken = async () => '',
      headerName = 'Authorization',
      tokenPrefix = 'Bearer'
    } = options;

    return async (requestOptions, context, next) => {
      const token = await getToken();
      if (token) {
        requestOptions.headers = {
          ...requestOptions.headers,
          [headerName]: `${tokenPrefix} ${token}`
        };
      }
      return next();
    };
  }

  /**
   * Caching middleware
   */
  static cache(options: {
    ttl?: number;
    maxSize?: number;
    keyGenerator?: (options: RequestOptions) => string;
  } = {}): {
    request: RequestMiddleware;
    response: ResponseMiddleware;
  } {
    const {
      ttl = 60000, // 1 minute
      maxSize = 100,
      keyGenerator = (options) => JSON.stringify(options)
    } = options;

    const cache = new Map<string, { data: Response; expires: number }>();

    return {
      request: async (requestOptions, context, next) => {
        const cacheKey = keyGenerator(requestOptions);
        const cached = cache.get(cacheKey);
        
        if (cached && cached.expires > Date.now()) {
          context.metadata.fromCache = true;
          return cached.data;
        }
        
        return next();
      },

      response: async (response, context, next) => {
        if (!context.metadata.fromCache && response.success) {
          const cacheKey = keyGenerator(context.state.requestOptions);
          
          // Remove oldest entries if cache is full
          if (cache.size >= maxSize) {
            const oldestKey = cache.keys().next().value;
            cache.delete(oldestKey);
          }
          
          cache.set(cacheKey, {
            data: response,
            expires: Date.now() + ttl
          });
        }
        
        return next();
      }
    };
  }

  /**
   * Performance monitoring middleware
   */
  static performance(): {
    request: RequestMiddleware;
    response: ResponseMiddleware;
  } {
    const metrics = {
      requests: 0,
      errors: 0,
      totalTime: 0,
      minTime: Infinity,
      maxTime: 0
    };

    return {
      request: async (requestOptions, context, next) => {
        context.metadata.startTime = Date.now();
        metrics.requests++;
        return next();
      },

      response: async (response, context, next) => {
        const duration = Date.now() - context.metadata.startTime;
        metrics.totalTime += duration;
        metrics.minTime = Math.min(metrics.minTime, duration);
        metrics.maxTime = Math.max(metrics.maxTime, duration);
        
        if (!response.success) {
          metrics.errors++;
        }
        
        // Add metrics to response headers for debugging
        response.headers = {
          ...response.headers,
          'X-Request-Duration': duration.toString(),
          'X-Average-Duration': (metrics.totalTime / metrics.requests).toString(),
          'X-Error-Rate': (metrics.errors / metrics.requests).toString()
        };
        
        return next();
      }
    };
  }
}

/**
 * Middleware manager for organizing and applying middleware
 */
export class MiddlewareManager {
  private pipeline: MiddlewarePipeline = new MiddlewarePipeline();
  private plugins: Map<string, Plugin> = new Map();

  /**
   * Install plugin
   */
  public async installPlugin(plugin: Plugin): Promise<void> {
    if (this.plugins.has(plugin.name)) {
      throw new HyperSimError(`Plugin ${plugin.name} is already installed`);
    }

    // Initialize plugin
    if (plugin.initialize) {
      await plugin.initialize(this);
    }

    // Register plugin hooks
    if (plugin.beforeRequest) {
      this.pipeline.addHook({
        name: `${plugin.name}-before-request`,
        phase: 'before-request',
        handler: plugin.beforeRequest
      });
    }

    if (plugin.afterResponse) {
      this.pipeline.addHook({
        name: `${plugin.name}-after-response`,
        phase: 'after-response',
        handler: plugin.afterResponse
      });
    }

    if (plugin.onError) {
      this.pipeline.addHook({
        name: `${plugin.name}-on-error`,
        phase: 'on-error',
        handler: plugin.onError
      });
    }

    this.plugins.set(plugin.name, plugin);
  }

  /**
   * Uninstall plugin
   */
  public uninstallPlugin(pluginName: string): void {
    this.plugins.delete(pluginName);
    // Note: Hooks remain registered - in production, implement hook removal
  }

  /**
   * Get installed plugins
   */
  public getPlugins(): Plugin[] {
    return Array.from(this.plugins.values());
  }

  /**
   * Get middleware pipeline
   */
  public getPipeline(): MiddlewarePipeline {
    return this.pipeline;
  }

  /**
   * Apply built-in middleware configurations
   */
  public applyDefaults(options: {
    enableLogging?: boolean;
    enableRetry?: boolean;
    enableRateLimit?: boolean;
    enableCache?: boolean;
    enablePerformance?: boolean;
  } = {}): void {
    const {
      enableLogging = true,
      enableRetry = true,
      enableRateLimit = false,
      enableCache = false,
      enablePerformance = true
    } = options;

    if (enableLogging) {
      const logging = BuiltInMiddleware.logging();
      this.pipeline.useRequest(logging.request);
      this.pipeline.useResponse(logging.response);
      this.pipeline.useError(logging.error);
    }

    if (enableRetry) {
      this.pipeline.useError(BuiltInMiddleware.retry());
    }

    if (enableRateLimit) {
      this.pipeline.useRequest(BuiltInMiddleware.rateLimit());
    }

    if (enableCache) {
      const cache = BuiltInMiddleware.cache();
      this.pipeline.useRequest(cache.request);
      this.pipeline.useResponse(cache.response);
    }

    if (enablePerformance) {
      const performance = BuiltInMiddleware.performance();
      this.pipeline.useRequest(performance.request);
      this.pipeline.useResponse(performance.response);
    }
  }
}
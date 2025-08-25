/**
 * Metrics plugin for performance monitoring and analytics
 */

import { Plugin, PluginSystem, HookContext } from './PluginSystem';
import { PerformanceMetrics } from '../types/common';

/**
 * Metrics configuration
 */
export interface MetricsConfig {
  /** Enable performance metrics collection */
  enabled: boolean;
  /** Metrics collection interval in milliseconds */
  interval: number;
  /** Maximum number of data points to keep in memory */
  maxDataPoints: number;
  /** Enable detailed timing metrics */
  detailedTiming: boolean;
  /** Custom metrics reporter */
  reporter?: (metrics: PerformanceMetrics) => void;
}

/**
 * Request timing data
 */
interface RequestTiming {
  startTime: number;
  endTime?: number;
  duration?: number;
  success?: boolean;
  error?: string;
}

/**
 * Default metrics configuration
 */
const DEFAULT_CONFIG: MetricsConfig = {
  enabled: true,
  interval: 60000, // 1 minute
  maxDataPoints: 1000,
  detailedTiming: false
};

/**
 * Metrics plugin implementation
 */
export class MetricsPlugin implements Plugin {
  public readonly name = 'metrics';
  public readonly version = '1.0.0';
  public readonly description = 'Performance monitoring and analytics';

  private config: MetricsConfig;
  private startTime = Date.now();
  private requestTimings = new Map<string, RequestTiming>();
  private metrics: PerformanceMetrics;
  private intervalTimer?: NodeJS.Timeout;
  private responseTimesBuffer: number[] = [];
  private connectionPoolStats = { active: 0, idle: 0, total: 0 };
  private cacheStats = { hits: 0, misses: 0, total: 0 };

  constructor(config: Partial<MetricsConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.initializeMetrics();
  }

  async initialize(system: PluginSystem): Promise<void> {
    if (!this.config.enabled) {
      return;
    }

    // Start metrics collection interval
    this.intervalTimer = setInterval(() => {
      this.updateMetrics();
      if (this.config.reporter) {
        this.config.reporter(this.getMetrics());
      }
    }, this.config.interval);

    console.log('[Metrics Plugin] Initialized - collection enabled');
  }

  async cleanup(): Promise<void> {
    if (this.intervalTimer) {
      clearInterval(this.intervalTimer);
    }
    this.requestTimings.clear();
    this.responseTimesBuffer = [];
    console.log('[Metrics Plugin] Cleaned up');
  }

  public readonly hooks = {
    'before-request': async (context: HookContext): Promise<void> => {
      if (!this.config.enabled) return;

      this.requestTimings.set(context.requestId, {
        startTime: Date.now()
      });
    },

    'after-response': async (context: HookContext, response: any): Promise<void> => {
      if (!this.config.enabled) return;

      const timing = this.requestTimings.get(context.requestId);
      if (timing) {
        timing.endTime = Date.now();
        timing.duration = timing.endTime - timing.startTime;
        timing.success = response.status < 400;
        
        this.recordResponse(timing);
        this.requestTimings.delete(context.requestId);
      }
    },

    'after-simulation': async (context: HookContext, result: any): Promise<void> => {
      if (!this.config.enabled) return;

      this.metrics.totalRequests++;
      if (result.success) {
        this.metrics.successfulRequests++;
      } else {
        this.metrics.failedRequests++;
      }
    },

    'on-error': async (context: HookContext, error: any): Promise<void> => {
      if (!this.config.enabled) return;

      this.metrics.failedRequests++;
      
      const timing = this.requestTimings.get(context.requestId);
      if (timing) {
        timing.endTime = Date.now();
        timing.duration = timing.endTime - timing.startTime;
        timing.success = false;
        timing.error = error.message;
        
        this.recordResponse(timing);
        this.requestTimings.delete(context.requestId);
      }
    },

    'on-connect': async (): Promise<void> => {
      if (!this.config.enabled) return;
      this.connectionPoolStats.active++;
      this.connectionPoolStats.total++;
    },

    'on-disconnect': async (): Promise<void> => {
      if (!this.config.enabled) return;
      this.connectionPoolStats.active--;
    }
  };

  /**
   * Initialize metrics object
   */
  private initializeMetrics(): void {
    this.metrics = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      averageResponseTime: 0,
      connectionPool: {
        active: 0,
        idle: 0,
        total: 0
      },
      cacheHitRatio: 0,
      uptime: 0
    };
  }

  /**
   * Record response timing
   */
  private recordResponse(timing: RequestTiming): void {
    if (timing.duration) {
      this.responseTimesBuffer.push(timing.duration);
      
      // Keep buffer size manageable
      if (this.responseTimesBuffer.length > this.config.maxDataPoints) {
        this.responseTimesBuffer = this.responseTimesBuffer.slice(-this.config.maxDataPoints);
      }
    }
  }

  /**
   * Update metrics calculations
   */
  private updateMetrics(): void {
    // Update average response time
    if (this.responseTimesBuffer.length > 0) {
      const sum = this.responseTimesBuffer.reduce((a, b) => a + b, 0);
      this.metrics.averageResponseTime = sum / this.responseTimesBuffer.length;
    }

    // Update connection pool stats
    this.metrics.connectionPool = { ...this.connectionPoolStats };
    this.connectionPoolStats.idle = Math.max(0, this.connectionPoolStats.total - this.connectionPoolStats.active);
    this.metrics.connectionPool.idle = this.connectionPoolStats.idle;

    // Update cache hit ratio
    if (this.cacheStats.total > 0) {
      this.metrics.cacheHitRatio = this.cacheStats.hits / this.cacheStats.total;
    }

    // Update uptime
    this.metrics.uptime = Date.now() - this.startTime;
  }

  /**
   * Record cache hit
   */
  recordCacheHit(): void {
    if (!this.config.enabled) return;
    this.cacheStats.hits++;
    this.cacheStats.total++;
  }

  /**
   * Record cache miss
   */
  recordCacheMiss(): void {
    if (!this.config.enabled) return;
    this.cacheStats.misses++;
    this.cacheStats.total++;
  }

  /**
   * Get current metrics
   */
  getMetrics(): PerformanceMetrics {
    this.updateMetrics();
    return { ...this.metrics };
  }

  /**
   * Get detailed timing data
   */
  getDetailedMetrics(): {
    metrics: PerformanceMetrics;
    responseTimes: number[];
    activeRequests: number;
  } {
    return {
      metrics: this.getMetrics(),
      responseTimes: [...this.responseTimesBuffer],
      activeRequests: this.requestTimings.size
    };
  }

  /**
   * Reset metrics
   */
  resetMetrics(): void {
    this.initializeMetrics();
    this.responseTimesBuffer = [];
    this.cacheStats = { hits: 0, misses: 0, total: 0 };
    this.startTime = Date.now();
    console.log('[Metrics Plugin] Metrics reset');
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<MetricsConfig>): void {
    const wasEnabled = this.config.enabled;
    this.config = { ...this.config, ...newConfig };
    
    // Handle enable/disable
    if (!wasEnabled && this.config.enabled) {
      // Re-enable
      this.resetMetrics();
    } else if (wasEnabled && !this.config.enabled) {
      // Disable
      if (this.intervalTimer) {
        clearInterval(this.intervalTimer);
        this.intervalTimer = undefined;
      }
    }
    
    console.log('[Metrics Plugin] Configuration updated');
  }

  /**
   * Get current configuration
   */
  getConfig(): MetricsConfig {
    return { ...this.config };
  }

  /**
   * Export metrics to JSON
   */
  exportMetrics(): string {
    const exportData = {
      timestamp: new Date().toISOString(),
      metrics: this.getMetrics(),
      config: this.getConfig(),
      detailedData: this.config.detailedTiming ? {
        responseTimes: this.responseTimesBuffer,
        cacheStats: this.cacheStats,
        connectionPoolStats: this.connectionPoolStats
      } : undefined
    };
    
    return JSON.stringify(exportData, null, 2);
  }
}
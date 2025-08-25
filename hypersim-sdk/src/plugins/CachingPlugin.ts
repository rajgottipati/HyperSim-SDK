/**
 * Caching plugin for intelligent response caching
 */

import { Plugin, PluginSystem, HookContext } from './PluginSystem';
import { CacheEntry } from '../types/common';

/**
 * Caching configuration
 */
export interface CachingConfig {
  /** Enable caching */
  enabled: boolean;
  /** Default cache TTL in seconds */
  defaultTtl: number;
  /** Maximum cache size (number of entries) */
  maxSize: number;
  /** Custom cache key generator */
  keyGenerator?: (context: HookContext, ...args: any[]) => string;
  /** Cache eviction strategy */
  evictionStrategy: 'lru' | 'lfu' | 'ttl';
  /** Enable cache statistics */
  statistics: boolean;
}

/**
 * Cache statistics
 */
export interface CacheStats {
  hits: number;
  misses: number;
  evictions: number;
  totalRequests: number;
  hitRatio: number;
  size: number;
  maxSize: number;
}

/**
 * Default caching configuration
 */
const DEFAULT_CONFIG: CachingConfig = {
  enabled: true,
  defaultTtl: 300, // 5 minutes
  maxSize: 1000,
  evictionStrategy: 'lru',
  statistics: true
};

/**
 * Caching plugin implementation
 */
export class CachingPlugin implements Plugin {
  public readonly name = 'caching';
  public readonly version = '1.0.0';
  public readonly description = 'Intelligent response caching with multiple eviction strategies';

  private config: CachingConfig;
  private cache = new Map<string, CacheEntry<any>>();
  private accessOrder: string[] = []; // For LRU
  private accessCount = new Map<string, number>(); // For LFU
  private stats: CacheStats;
  private cleanupTimer?: NodeJS.Timeout;

  constructor(config: Partial<CachingConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.initializeStats();
  }

  async initialize(system: PluginSystem): Promise<void> {
    if (!this.config.enabled) {
      return;
    }

    // Start cleanup timer for expired entries
    this.cleanupTimer = setInterval(() => {
      this.cleanupExpired();
    }, 60000); // Cleanup every minute

    console.log('[Caching Plugin] Initialized with strategy:', this.config.evictionStrategy);
  }

  async cleanup(): Promise<void> {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
    }
    this.cache.clear();
    this.accessOrder = [];
    this.accessCount.clear();
    console.log('[Caching Plugin] Cleaned up');
  }

  public readonly hooks = {
    'before-request': async (context: HookContext, request: any): Promise<HookContext> => {
      if (!this.config.enabled || !this.isCacheable(request)) {
        return context;
      }

      const cacheKey = this.generateCacheKey(context, request);
      const cached = this.get(cacheKey);
      
      if (cached) {
        // Cache hit - return cached response
        context.modifiedData = { cached: true, response: cached };
        context.halt = true; // Stop further processing
        
        if (this.config.statistics) {
          this.stats.hits++;
          this.stats.totalRequests++;
          this.updateHitRatio();
        }
      } else {
        // Cache miss - store key for later caching
        context.modifiedData = { cacheKey, shouldCache: true };
        
        if (this.config.statistics) {
          this.stats.misses++;
          this.stats.totalRequests++;
          this.updateHitRatio();
        }
      }

      return context;
    },

    'after-response': async (context: HookContext, response: any): Promise<void> => {
      if (!this.config.enabled || !context.modifiedData?.shouldCache) {
        return;
      }

      const { cacheKey } = context.modifiedData;
      if (cacheKey && this.shouldCacheResponse(response)) {
        this.set(cacheKey, response, this.getTtlForResponse(response));
      }
    },

    'after-simulation': async (context: HookContext, result: any): Promise<void> => {
      if (!this.config.enabled || !result.success) {
        return;
      }

      const cacheKey = this.generateSimulationCacheKey(context, result);
      this.set(cacheKey, result, this.config.defaultTtl);
    }
  };

  /**
   * Get item from cache
   */
  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) {
      return null;
    }

    // Check if expired
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      this.removeFromAccessTracking(key);
      return null;
    }

    // Update access tracking
    entry.hits++;
    entry.lastAccessed = Date.now();
    this.updateAccessTracking(key);

    return entry.value;
  }

  /**
   * Set item in cache
   */
  set<T>(key: string, value: T, ttl?: number): void {
    const actualTtl = ttl || this.config.defaultTtl;
    const expiresAt = Date.now() + (actualTtl * 1000);

    // Check if we need to evict
    if (this.cache.size >= this.config.maxSize && !this.cache.has(key)) {
      this.evict();
    }

    const entry: CacheEntry<T> = {
      value,
      expiresAt,
      hits: 0,
      lastAccessed: Date.now()
    };

    this.cache.set(key, entry);
    this.updateAccessTracking(key);

    if (this.config.statistics) {
      this.stats.size = this.cache.size;
    }
  }

  /**
   * Delete item from cache
   */
  delete(key: string): boolean {
    const deleted = this.cache.delete(key);
    if (deleted) {
      this.removeFromAccessTracking(key);
      if (this.config.statistics) {
        this.stats.size = this.cache.size;
      }
    }
    return deleted;
  }

  /**
   * Clear entire cache
   */
  clear(): void {
    this.cache.clear();
    this.accessOrder = [];
    this.accessCount.clear();
    this.initializeStats();
  }

  /**
   * Generate cache key
   */
  private generateCacheKey(context: HookContext, request: any): string {
    if (this.config.keyGenerator) {
      return this.config.keyGenerator(context, request);
    }

    // Default key generation
    const parts = [
      request.method || 'GET',
      request.url || request.endpoint,
      request.data ? JSON.stringify(request.data) : ''
    ];
    
    return parts.join('|');
  }

  /**
   * Generate simulation cache key
   */
  private generateSimulationCacheKey(context: HookContext, result: any): string {
    return `simulation:${result.from}:${result.to}:${result.data || ''}:${result.value || ''}`;
  }

  /**
   * Check if request is cacheable
   */
  private isCacheable(request: any): boolean {
    // Only cache GET requests and read-only operations
    const method = request.method || 'GET';
    return method === 'GET' || method === 'POST' && request.readOnly === true;
  }

  /**
   * Check if response should be cached
   */
  private shouldCacheResponse(response: any): boolean {
    // Don't cache errors
    if (response.status && response.status >= 400) {
      return false;
    }

    // Don't cache empty responses
    if (!response.data && !response.body) {
      return false;
    }

    return true;
  }

  /**
   * Get TTL for specific response
   */
  private getTtlForResponse(response: any): number {
    // Check for cache-control headers
    const cacheControl = response.headers?.['cache-control'];
    if (cacheControl) {
      const maxAge = cacheControl.match(/max-age=(\d+)/);
      if (maxAge) {
        return parseInt(maxAge[1], 10);
      }
    }

    return this.config.defaultTtl;
  }

  /**
   * Update access tracking for eviction strategies
   */
  private updateAccessTracking(key: string): void {
    switch (this.config.evictionStrategy) {
      case 'lru':
        // Move to end of access order
        const index = this.accessOrder.indexOf(key);
        if (index > -1) {
          this.accessOrder.splice(index, 1);
        }
        this.accessOrder.push(key);
        break;
        
      case 'lfu':
        // Increment access count
        this.accessCount.set(key, (this.accessCount.get(key) || 0) + 1);
        break;
    }
  }

  /**
   * Remove from access tracking
   */
  private removeFromAccessTracking(key: string): void {
    const index = this.accessOrder.indexOf(key);
    if (index > -1) {
      this.accessOrder.splice(index, 1);
    }
    this.accessCount.delete(key);
  }

  /**
   * Evict items based on strategy
   */
  private evict(): void {
    let keyToEvict: string | undefined;

    switch (this.config.evictionStrategy) {
      case 'lru':
        keyToEvict = this.accessOrder[0]; // Least recently used
        break;
        
      case 'lfu':
        // Find least frequently used
        let minCount = Infinity;
        for (const [key, count] of this.accessCount) {
          if (count < minCount) {
            minCount = count;
            keyToEvict = key;
          }
        }
        break;
        
      case 'ttl':
        // Find item with earliest expiration
        let earliestExpiration = Infinity;
        for (const [key, entry] of this.cache) {
          if (entry.expiresAt < earliestExpiration) {
            earliestExpiration = entry.expiresAt;
            keyToEvict = key;
          }
        }
        break;
    }

    if (keyToEvict) {
      this.delete(keyToEvict);
      if (this.config.statistics) {
        this.stats.evictions++;
      }
    }
  }

  /**
   * Clean up expired entries
   */
  private cleanupExpired(): void {
    const now = Date.now();
    const keysToDelete: string[] = [];

    for (const [key, entry] of this.cache) {
      if (now > entry.expiresAt) {
        keysToDelete.push(key);
      }
    }

    keysToDelete.forEach(key => this.delete(key));

    if (keysToDelete.length > 0 && this.config.statistics) {
      this.stats.evictions += keysToDelete.length;
    }
  }

  /**
   * Initialize statistics
   */
  private initializeStats(): void {
    this.stats = {
      hits: 0,
      misses: 0,
      evictions: 0,
      totalRequests: 0,
      hitRatio: 0,
      size: 0,
      maxSize: this.config.maxSize
    };
  }

  /**
   * Update hit ratio
   */
  private updateHitRatio(): void {
    if (this.stats.totalRequests > 0) {
      this.stats.hitRatio = this.stats.hits / this.stats.totalRequests;
    }
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    this.stats.size = this.cache.size;
    return { ...this.stats };
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<CachingConfig>): void {
    this.config = { ...this.config, ...newConfig };
    
    // Handle max size change
    if (newConfig.maxSize && newConfig.maxSize < this.cache.size) {
      // Evict excess entries
      const excess = this.cache.size - newConfig.maxSize;
      for (let i = 0; i < excess; i++) {
        this.evict();
      }
    }
    
    console.log('[Caching Plugin] Configuration updated');
  }

  /**
   * Get current configuration
   */
  getConfig(): CachingConfig {
    return { ...this.config };
  }
}
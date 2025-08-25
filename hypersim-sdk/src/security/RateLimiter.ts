/**
 * Advanced rate limiting with DDoS protection
 */

import { EventEmitter } from 'events';
import { RateLimitConfig } from './types';

interface RateLimitEntry {
  count: number;
  window: number;
  queue: Array<{ request: any; resolve: Function; reject: Function; timestamp: number }>;
  suspiciousActivity: number;
  lastRequest: number;
}

interface DDoSMetrics {
  requestsPerSecond: number;
  uniqueIPs: Set<string>;
  suspiciousPatterns: number;
  blockedRequests: number;
}

export class RateLimiter extends EventEmitter {
  private readonly config: Required<RateLimitConfig>;
  private readonly limits: Map<string, RateLimitEntry> = new Map();
  private readonly ddosMetrics: DDoSMetrics;
  private cleanupInterval: NodeJS.Timeout;

  constructor(config: RateLimitConfig) {
    super();
    
    this.config = {
      requestsPerWindow: config.requestsPerWindow,
      windowMs: config.windowMs,
      maxQueueSize: config.maxQueueSize ?? 100,
      ddosProtection: config.ddosProtection ?? true,
      ddosThreshold: config.ddosThreshold ?? 1000
    };

    this.ddosMetrics = {
      requestsPerSecond: 0,
      uniqueIPs: new Set(),
      suspiciousPatterns: 0,
      blockedRequests: 0
    };

    // Cleanup old entries every minute
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 60000);

    // DDoS monitoring every second
    if (this.config.ddosProtection) {
      setInterval(() => {
        this.monitorDDoS();
      }, 1000);
    }
  }

  /**
   * Check if request is within rate limit
   */
  async checkLimit(request: any): Promise<boolean> {
    const identifier = this.getIdentifier(request);
    const now = Date.now();
    
    // Check for DDoS patterns
    if (this.config.ddosProtection && this.isDDoSRequest(request, identifier)) {
      this.ddosMetrics.blockedRequests++;
      this.emit('ddosDetected', {
        identifier,
        timestamp: now,
        metrics: this.getDDoSMetrics()
      });
      return false;
    }

    let entry = this.limits.get(identifier);
    
    if (!entry) {
      entry = {
        count: 0,
        window: now,
        queue: [],
        suspiciousActivity: 0,
        lastRequest: 0
      };
      this.limits.set(identifier, entry);
    }

    // Reset window if expired
    if (now - entry.window >= this.config.windowMs) {
      entry.count = 0;
      entry.window = now;
      entry.suspiciousActivity = 0;
    }

    // Check for suspicious patterns
    const timeSinceLastRequest = now - entry.lastRequest;
    if (timeSinceLastRequest < 100) { // Less than 100ms between requests
      entry.suspiciousActivity++;
      if (entry.suspiciousActivity > 10) {
        this.emit('suspiciousActivity', {
          identifier,
          pattern: 'rapid_requests',
          count: entry.suspiciousActivity
        });
        return false;
      }
    }

    entry.lastRequest = now;

    // Check rate limit
    if (entry.count >= this.config.requestsPerWindow) {
      // Queue request if queueing is enabled
      if (this.config.maxQueueSize > 0 && entry.queue.length < this.config.maxQueueSize) {
        return new Promise((resolve, reject) => {
          entry!.queue.push({
            request,
            resolve,
            reject,
            timestamp: now
          });
          
          // Process queue when window resets
          setTimeout(() => {
            this.processQueue(identifier);
          }, this.config.windowMs - (now - entry!.window));
        });
      }
      
      this.emit('rateLimitExceeded', {
        identifier,
        count: entry.count,
        window: entry.window,
        timestamp: now
      });
      
      return false;
    }

    entry.count++;
    this.updateDDoSMetrics(request, identifier);
    return true;
  }

  /**
   * Get current rate limit status for identifier
   */
  getStatus(identifier: string): {
    count: number;
    limit: number;
    remaining: number;
    resetTime: number;
    queueLength: number;
  } {
    const entry = this.limits.get(identifier);
    
    if (!entry) {
      return {
        count: 0,
        limit: this.config.requestsPerWindow,
        remaining: this.config.requestsPerWindow,
        resetTime: Date.now() + this.config.windowMs,
        queueLength: 0
      };
    }

    const remaining = Math.max(0, this.config.requestsPerWindow - entry.count);
    const resetTime = entry.window + this.config.windowMs;

    return {
      count: entry.count,
      limit: this.config.requestsPerWindow,
      remaining,
      resetTime,
      queueLength: entry.queue.length
    };
  }

  /**
   * Get DDoS metrics
   */
  getDDoSMetrics(): DDoSMetrics {
    return {
      requestsPerSecond: this.ddosMetrics.requestsPerSecond,
      uniqueIPs: new Set(this.ddosMetrics.uniqueIPs),
      suspiciousPatterns: this.ddosMetrics.suspiciousPatterns,
      blockedRequests: this.ddosMetrics.blockedRequests
    };
  }

  /**
   * Reset rate limit for identifier
   */
  reset(identifier: string): void {
    this.limits.delete(identifier);
  }

  /**
   * Reset all rate limits
   */
  resetAll(): void {
    this.limits.clear();
    this.ddosMetrics.uniqueIPs.clear();
    this.ddosMetrics.requestsPerSecond = 0;
    this.ddosMetrics.suspiciousPatterns = 0;
    this.ddosMetrics.blockedRequests = 0;
  }

  /**
   * Update rate limit configuration
   */
  updateConfig(newConfig: Partial<RateLimitConfig>): void {
    Object.assign(this.config, newConfig);
    this.emit('configUpdated', this.config);
  }

  /**
   * Shutdown rate limiter
   */
  shutdown(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    
    // Process any remaining queued requests
    for (const [identifier] of this.limits) {
      this.processQueue(identifier);
    }
  }

  private getIdentifier(request: any): string {
    // Use IP address if available, otherwise use a general identifier
    return request.ip || request.clientId || request.headers?.['x-forwarded-for'] || 'default';
  }

  private isDDoSRequest(request: any, identifier: string): boolean {
    const now = Date.now();
    const entry = this.limits.get(identifier);
    
    // Check if requests are coming too fast
    if (entry && (now - entry.lastRequest) < 10) {
      return true;
    }

    // Check overall system load
    if (this.ddosMetrics.requestsPerSecond > this.config.ddosThreshold) {
      return true;
    }

    // Check for patterns typical of DDoS attacks
    const userAgent = request.headers?.['user-agent'];
    if (!userAgent || userAgent.length < 10) {
      this.ddosMetrics.suspiciousPatterns++;
      return this.ddosMetrics.suspiciousPatterns > 50;
    }

    return false;
  }

  private updateDDoSMetrics(request: any, identifier: string): void {
    this.ddosMetrics.requestsPerSecond++;
    
    const ip = this.extractIP(request);
    if (ip) {
      this.ddosMetrics.uniqueIPs.add(ip);
    }
  }

  private extractIP(request: any): string | null {
    return (
      request.ip ||
      request.connection?.remoteAddress ||
      request.headers?.['x-forwarded-for']?.split(',')[0] ||
      request.headers?.['x-real-ip'] ||
      null
    );
  }

  private monitorDDoS(): void {
    // Reset per-second counter
    this.ddosMetrics.requestsPerSecond = 0;
    
    // Clear old IPs (keep only last minute)
    if (this.ddosMetrics.uniqueIPs.size > 1000) {
      this.ddosMetrics.uniqueIPs.clear();
    }
  }

  private async processQueue(identifier: string): Promise<void> {
    const entry = this.limits.get(identifier);
    if (!entry || entry.queue.length === 0) {
      return;
    }

    const now = Date.now();
    
    // Process requests that can fit in the new window
    while (entry.queue.length > 0 && entry.count < this.config.requestsPerWindow) {
      const queuedRequest = entry.queue.shift()!;
      
      // Check if request hasn't timed out (5 minute timeout)
      if (now - queuedRequest.timestamp > 5 * 60 * 1000) {
        queuedRequest.reject(new Error('Request timeout'));
        continue;
      }

      entry.count++;
      queuedRequest.resolve(true);
    }

    // Reject remaining requests if queue is still full
    while (entry.queue.length > 0) {
      const queuedRequest = entry.queue.shift()!;
      queuedRequest.reject(new Error('Rate limit exceeded'));
    }
  }

  private cleanup(): void {
    const now = Date.now();
    const expiredThreshold = now - (this.config.windowMs * 2); // Keep for 2 windows
    
    for (const [identifier, entry] of this.limits.entries()) {
      if (entry.window < expiredThreshold && entry.queue.length === 0) {
        this.limits.delete(identifier);
      }
    }
  }
}

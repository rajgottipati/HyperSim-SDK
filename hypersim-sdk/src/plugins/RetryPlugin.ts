/**
 * Retry plugin with exponential backoff and circuit breaker
 */

import { Plugin, PluginSystem, HookContext } from './PluginSystem';
import { RetryConfig, CircuitBreakerConfig, CircuitBreakerState, DEFAULT_RETRY_CONFIG } from '../types/common';

/**
 * Extended retry configuration
 */
export interface RetryPluginConfig extends RetryConfig {
  /** Enable circuit breaker */
  circuitBreaker: boolean;
  /** Circuit breaker configuration */
  circuitBreakerConfig: CircuitBreakerConfig;
  /** Retry on specific error codes */
  retryOnCodes?: string[];
  /** Don't retry on specific error codes */
  skipOnCodes?: string[];
}

/**
 * Circuit breaker state tracking
 */
interface CircuitBreakerState {
  state: CircuitBreakerState;
  failures: number;
  requests: number;
  lastFailTime: number;
  nextAttemptTime: number;
}

/**
 * Default retry plugin configuration
 */
const DEFAULT_CONFIG: RetryPluginConfig = {
  ...DEFAULT_RETRY_CONFIG,
  circuitBreaker: true,
  circuitBreakerConfig: {
    failureThreshold: 5,
    timeout: 60000, // 1 minute
    monitoringWindow: 300000, // 5 minutes
    minimumRequests: 10
  },
  retryOnCodes: ['NETWORK_ERROR', 'TIMEOUT_ERROR', 'RATE_LIMIT_ERROR'],
  skipOnCodes: ['VALIDATION_ERROR', 'AUTH_ERROR']
};

/**
 * Retry plugin implementation
 */
export class RetryPlugin implements Plugin {
  public readonly name = 'retry';
  public readonly version = '1.0.0';
  public readonly description = 'Intelligent retry mechanism with exponential backoff and circuit breaker';

  private config: RetryPluginConfig;
  private circuitBreakers = new Map<string, CircuitBreakerState>();
  private requestAttempts = new Map<string, number>();

  constructor(config: Partial<RetryPluginConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  async initialize(system: PluginSystem): Promise<void> {
    console.log('[Retry Plugin] Initialized with config:', {
      maxAttempts: this.config.maxAttempts,
      circuitBreaker: this.config.circuitBreaker,
      failureThreshold: this.config.circuitBreakerConfig.failureThreshold
    });
  }

  async cleanup(): Promise<void> {
    this.circuitBreakers.clear();
    this.requestAttempts.clear();
    console.log('[Retry Plugin] Cleaned up');
  }

  public readonly hooks = {
    'before-request': async (context: HookContext, request: any): Promise<HookContext> => {
      const endpoint = this.getEndpointKey(request);
      
      // Check circuit breaker
      if (this.config.circuitBreaker && this.isCircuitOpen(endpoint)) {
        throw new Error(`Circuit breaker is OPEN for endpoint: ${endpoint}`);
      }

      // Initialize attempt counter
      this.requestAttempts.set(context.requestId, 1);
      
      return context;
    },

    'on-error': async (context: HookContext, error: any): Promise<HookContext> => {
      const currentAttempts = this.requestAttempts.get(context.requestId) || 1;
      const shouldRetry = this.shouldRetry(error, currentAttempts);
      
      if (!shouldRetry) {
        // Record failure for circuit breaker
        if (this.config.circuitBreaker) {
          this.recordFailure(this.getEndpointKey(context.data));
        }
        return context;
      }

      // Calculate retry delay
      const delay = this.calculateDelay(currentAttempts);
      
      console.log(`[Retry Plugin] Retrying request ${context.requestId} (attempt ${currentAttempts + 1}/${this.config.maxAttempts}) after ${delay}ms`);
      
      // Wait before retry
      await this.sleep(delay);
      
      // Update attempt counter
      this.requestAttempts.set(context.requestId, currentAttempts + 1);
      
      // Indicate retry should happen
      context.modifiedData = { shouldRetry: true, attempt: currentAttempts + 1 };
      
      return context;
    },

    'after-response': async (context: HookContext, response: any): Promise<void> => {
      const endpoint = this.getEndpointKey(context.data);
      
      if (this.config.circuitBreaker) {
        if (response.status && response.status < 400) {
          this.recordSuccess(endpoint);
        } else {
          this.recordFailure(endpoint);
        }
      }
      
      // Clean up attempt counter
      this.requestAttempts.delete(context.requestId);
    }
  };

  /**
   * Check if we should retry the request
   */
  private shouldRetry(error: any, currentAttempts: number): boolean {
    // Check attempt limit
    if (currentAttempts >= this.config.maxAttempts) {
      return false;
    }

    // Check skip codes
    if (this.config.skipOnCodes && this.config.skipOnCodes.includes(error.code)) {
      return false;
    }

    // Check retry codes
    if (this.config.retryOnCodes) {
      return this.config.retryOnCodes.includes(error.code);
    }

    // Default: retry on network errors, timeouts, and rate limits
    const retryableErrors = ['NETWORK_ERROR', 'TIMEOUT_ERROR', 'RATE_LIMIT_ERROR', 'CONNECTION_ERROR'];
    return retryableErrors.includes(error.code);
  }

  /**
   * Calculate retry delay with exponential backoff and jitter
   */
  private calculateDelay(attempt: number): number {
    let delay = this.config.initialDelay * Math.pow(this.config.backoffMultiplier, attempt - 1);
    
    // Apply max delay limit
    delay = Math.min(delay, this.config.maxDelay);
    
    // Apply jitter
    if (this.config.jitter) {
      const jitterAmount = delay * 0.1; // 10% jitter
      delay += (Math.random() - 0.5) * 2 * jitterAmount;
    }
    
    return Math.max(0, Math.floor(delay));
  }

  /**
   * Sleep for specified duration
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get endpoint key for circuit breaker
   */
  private getEndpointKey(request: any): string {
    if (!request) return 'default';
    return request.url || request.endpoint || request.method || 'default';
  }

  /**
   * Check if circuit breaker is open
   */
  private isCircuitOpen(endpoint: string): boolean {
    const breaker = this.circuitBreakers.get(endpoint);
    if (!breaker) return false;

    const now = Date.now();
    
    switch (breaker.state) {
      case CircuitBreakerState.CLOSED:
        return false;
        
      case CircuitBreakerState.OPEN:
        if (now >= breaker.nextAttemptTime) {
          // Transition to half-open
          breaker.state = CircuitBreakerState.HALF_OPEN;
          return false;
        }
        return true;
        
      case CircuitBreakerState.HALF_OPEN:
        return false;
        
      default:
        return false;
    }
  }

  /**
   * Record successful request
   */
  private recordSuccess(endpoint: string): void {
    const breaker = this.getOrCreateCircuitBreaker(endpoint);
    const now = Date.now();
    
    // Reset failure count on success
    breaker.failures = 0;
    breaker.requests++;
    
    // Transition from half-open to closed on success
    if (breaker.state === CircuitBreakerState.HALF_OPEN) {
      breaker.state = CircuitBreakerState.CLOSED;
    }
    
    // Clean up old data outside monitoring window
    if (now - breaker.lastFailTime > this.config.circuitBreakerConfig.monitoringWindow) {
      breaker.requests = 1;
      breaker.failures = 0;
    }
  }

  /**
   * Record failed request
   */
  private recordFailure(endpoint: string): void {
    const breaker = this.getOrCreateCircuitBreaker(endpoint);
    const now = Date.now();
    
    breaker.failures++;
    breaker.requests++;
    breaker.lastFailTime = now;
    
    // Check if we should open the circuit
    const shouldOpen = breaker.requests >= this.config.circuitBreakerConfig.minimumRequests &&
                      breaker.failures >= this.config.circuitBreakerConfig.failureThreshold;
    
    if (shouldOpen && breaker.state === CircuitBreakerState.CLOSED) {
      breaker.state = CircuitBreakerState.OPEN;
      breaker.nextAttemptTime = now + this.config.circuitBreakerConfig.timeout;
      
      console.log(`[Retry Plugin] Circuit breaker OPENED for endpoint: ${endpoint}`);
    } else if (breaker.state === CircuitBreakerState.HALF_OPEN) {
      // Return to open state if failure in half-open
      breaker.state = CircuitBreakerState.OPEN;
      breaker.nextAttemptTime = now + this.config.circuitBreakerConfig.timeout;
    }
    
    // Clean up old data outside monitoring window
    if (now - breaker.lastFailTime > this.config.circuitBreakerConfig.monitoringWindow) {
      breaker.requests = 1;
      breaker.failures = 1;
    }
  }

  /**
   * Get or create circuit breaker state
   */
  private getOrCreateCircuitBreaker(endpoint: string): CircuitBreakerState {
    let breaker = this.circuitBreakers.get(endpoint);
    
    if (!breaker) {
      breaker = {
        state: CircuitBreakerState.CLOSED,
        failures: 0,
        requests: 0,
        lastFailTime: 0,
        nextAttemptTime: 0
      };
      this.circuitBreakers.set(endpoint, breaker);
    }
    
    return breaker;
  }

  /**
   * Get circuit breaker status for all endpoints
   */
  getCircuitBreakerStatus(): Record<string, {
    state: string;
    failures: number;
    requests: number;
    failureRate: number;
  }> {
    const status: Record<string, any> = {};
    
    for (const [endpoint, breaker] of this.circuitBreakers) {
      status[endpoint] = {
        state: breaker.state,
        failures: breaker.failures,
        requests: breaker.requests,
        failureRate: breaker.requests > 0 ? breaker.failures / breaker.requests : 0
      };
    }
    
    return status;
  }

  /**
   * Reset circuit breaker for endpoint
   */
  resetCircuitBreaker(endpoint: string): void {
    const breaker = this.circuitBreakers.get(endpoint);
    if (breaker) {
      breaker.state = CircuitBreakerState.CLOSED;
      breaker.failures = 0;
      breaker.requests = 0;
      breaker.lastFailTime = 0;
      breaker.nextAttemptTime = 0;
      
      console.log(`[Retry Plugin] Circuit breaker reset for endpoint: ${endpoint}`);
    }
  }

  /**
   * Reset all circuit breakers
   */
  resetAllCircuitBreakers(): void {
    for (const endpoint of this.circuitBreakers.keys()) {
      this.resetCircuitBreaker(endpoint);
    }
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<RetryPluginConfig>): void {
    this.config = { ...this.config, ...newConfig };
    console.log('[Retry Plugin] Configuration updated');
  }

  /**
   * Get current configuration
   */
  getConfig(): RetryPluginConfig {
    return { ...this.config };
  }

  /**
   * Get retry statistics
   */
  getStats(): {
    activeRetries: number;
    circuitBreakers: number;
    openCircuits: number;
  } {
    return {
      activeRetries: this.requestAttempts.size,
      circuitBreakers: this.circuitBreakers.size,
      openCircuits: Array.from(this.circuitBreakers.values())
        .filter(b => b.state === CircuitBreakerState.OPEN).length
    };
  }
}
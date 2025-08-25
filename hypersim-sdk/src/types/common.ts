/**
 * Shared types and interfaces used across the SDK
 */

/**
 * Connection error class
 */
export class ConnectionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ConnectionError';
  }
}

/**
 * Retry strategy configuration
 */
export interface RetryConfig {
  /** Maximum number of retry attempts */
  maxAttempts: number;
  /** Initial retry delay in milliseconds */
  initialDelay: number;
  /** Maximum retry delay in milliseconds */
  maxDelay: number;
  /** Backoff multiplier */
  backoffMultiplier: number;
  /** Whether to add random jitter */
  jitter: boolean;
}

/**
 * Default retry configuration
 */
export const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxAttempts: 3,
  initialDelay: 1000,
  maxDelay: 30000,
  backoffMultiplier: 2,
  jitter: true
};

/**
 * Connection pool configuration
 */
export interface ConnectionPoolConfig {
  /** Maximum number of concurrent connections */
  maxConnections: number;
  /** Connection timeout in milliseconds */
  connectionTimeout: number;
  /** Idle connection timeout in milliseconds */
  idleTimeout: number;
  /** Enable connection pooling */
  enabled: boolean;
}

/**
 * Performance metrics
 */
export interface PerformanceMetrics {
  /** Total requests made */
  totalRequests: number;
  /** Successful requests */
  successfulRequests: number;
  /** Failed requests */
  failedRequests: number;
  /** Average response time in milliseconds */
  averageResponseTime: number;
  /** Connection pool stats */
  connectionPool: {
    active: number;
    idle: number;
    total: number;
  };
  /** Cache hit ratio */
  cacheHitRatio: number;
  /** Uptime in milliseconds */
  uptime: number;
}

/**
 * Cache entry interface
 */
export interface CacheEntry<T> {
  /** Cached value */
  value: T;
  /** Expiration timestamp */
  expiresAt: number;
  /** Cache hit count */
  hits: number;
  /** Last accessed timestamp */
  lastAccessed: number;
}

/**
 * Circuit breaker states
 */
export enum CircuitBreakerState {
  CLOSED = 'closed',
  OPEN = 'open',
  HALF_OPEN = 'half_open'
}

/**
 * Circuit breaker configuration
 */
export interface CircuitBreakerConfig {
  /** Failure threshold before opening circuit */
  failureThreshold: number;
  /** Timeout before attempting to close circuit */
  timeout: number;
  /** Monitoring window in milliseconds */
  monitoringWindow: number;
  /** Minimum requests before evaluating circuit */
  minimumRequests: number;
}

/**
 * Rate limiter configuration
 */
export interface RateLimiterConfig {
  /** Maximum requests per window */
  maxRequests: number;
  /** Time window in milliseconds */
  windowMs: number;
  /** Whether to queue requests when limit is exceeded */
  queueRequests: boolean;
  /** Maximum queue size */
  maxQueueSize: number;
}

/**
 * Request context for middleware and plugins
 */
export interface RequestContext {
  /** Unique request identifier */
  id: string;
  /** Request method */
  method: string;
  /** Request URL */
  url: string;
  /** Request headers */
  headers: Record<string, string>;
  /** Request body */
  body?: any;
  /** Request timestamp */
  timestamp: number;
  /** Request metadata */
  metadata: Record<string, any>;
}

/**
 * Response context for middleware and plugins
 */
export interface ResponseContext {
  /** Response status code */
  status: number;
  /** Response headers */
  headers: Record<string, string>;
  /** Response body */
  body?: any;
  /** Response timestamp */
  timestamp: number;
  /** Response time in milliseconds */
  responseTime: number;
}

/**
 * Health check result
 */
export interface HealthCheckResult {
  /** Service name */
  service: string;
  /** Health status */
  status: 'healthy' | 'degraded' | 'unhealthy';
  /** Timestamp of check */
  timestamp: number;
  /** Response time in milliseconds */
  responseTime: number;
  /** Additional details */
  details?: Record<string, any>;
  /** Error message if unhealthy */
  error?: string;
}

/**
 * SDK configuration options
 */
export interface SDKOptions {
  /** Request timeout in milliseconds */
  timeout?: number;
  /** Retry configuration */
  retry?: Partial<RetryConfig>;
  /** Connection pool configuration */
  connectionPool?: Partial<ConnectionPoolConfig>;
  /** Enable caching */
  cache?: boolean;
  /** Cache TTL in seconds */
  cacheTtl?: number;
  /** Enable metrics collection */
  metrics?: boolean;
  /** Rate limiter configuration */
  rateLimit?: Partial<RateLimiterConfig>;
  /** Circuit breaker configuration */
  circuitBreaker?: Partial<CircuitBreakerConfig>;
}

/**
 * Utility type for making properties optional
 */
export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

/**
 * Utility type for deep partial
 */
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};
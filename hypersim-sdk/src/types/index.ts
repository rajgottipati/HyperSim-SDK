/**
 * Common types and interfaces used throughout the SDK
 */

// Re-export all type modules
export * from './simulation';
export * from './network';
export * from './ai';
export * from './errors';

/**
 * Base configuration interface
 */
export interface BaseConfig {
  /** Enable debug logging */
  debug?: boolean;
  /** Request timeout in milliseconds */
  timeout?: number;
}

/**
 * Generic API response wrapper
 */
export interface ApiResponse<T> {
  /** Response data */
  data: T;
  /** Request success status */
  success: boolean;
  /** Error message if request failed */
  error?: string;
  /** Response timestamp */
  timestamp: number;
}

/**
 * Pagination interface for list responses
 */
export interface Pagination {
  /** Current page number */
  page: number;
  /** Items per page */
  limit: number;
  /** Total number of items */
  total: number;
  /** Whether there are more pages */
  hasMore: boolean;
}

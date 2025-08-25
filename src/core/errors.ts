/**
 * Custom error classes for HyperSim SDK
 * Provides structured error handling with context information
 */

/**
 * Base error class for all HyperSim SDK errors
 */
export class HyperSimError extends Error {
  public readonly code: string;
  public readonly timestamp: number;
  public readonly context: Record<string, any>;

  constructor(
    message: string,
    code: string = 'HYPERSIM_ERROR',
    context: Record<string, any> = {}
  ) {
    super(message);
    this.name = 'HyperSimError';
    this.code = code;
    this.timestamp = Date.now();
    this.context = context;

    // Ensure proper prototype chain
    Object.setPrototypeOf(this, HyperSimError.prototype);
  }

  /**
   * Convert error to JSON representation
   */
  public toJSON(): Record<string, any> {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      timestamp: this.timestamp,
      context: this.context,
      stack: this.stack
    };
  }

  /**
   * Create error with additional context
   */
  public withContext(context: Record<string, any>): HyperSimError {
    return new HyperSimError(
      this.message,
      this.code,
      { ...this.context, ...context }
    );
  }
}

/**
 * Network-related errors (connection, timeout, etc.)
 */
export class NetworkError extends HyperSimError {
  constructor(message: string, context?: Record<string, any>) {
    super(message, 'NETWORK_ERROR', context);
    this.name = 'NetworkError';
    Object.setPrototypeOf(this, NetworkError.prototype);
  }
}

/**
 * API-related errors (invalid response, rate limiting, etc.)
 */
export class APIError extends HyperSimError {
  public readonly statusCode: number;
  public readonly response: any;

  constructor(
    message: string,
    statusCode: number = 0,
    response: any = null,
    context: Record<string, any> = {}
  ) {
    super(message, 'API_ERROR', context);
    this.name = 'APIError';
    this.statusCode = statusCode;
    this.response = response;
    Object.setPrototypeOf(this, APIError.prototype);
  }

  /**
   * Create API error from HTTP response
   */
  public static fromResponse(
    response: { status: number; statusText: string; data?: any },
    context?: Record<string, any>
  ): APIError {
    const message = `API request failed: ${response.status} ${response.statusText}`;
    return new APIError(message, response.status, response.data, context);
  }
}

/**
 * Validation errors (invalid input, missing parameters, etc.)
 */
export class ValidationError extends HyperSimError {
  public readonly field: string;
  public readonly value: any;

  constructor(
    message: string,
    field: string = 'unknown',
    value: any = null,
    context: Record<string, any> = {}
  ) {
    super(message, 'VALIDATION_ERROR', context);
    this.name = 'ValidationError';
    this.field = field;
    this.value = value;
    Object.setPrototypeOf(this, ValidationError.prototype);
  }

  /**
   * Create validation error for specific field
   */
  public static forField(
    field: string,
    value: any,
    reason: string,
    context?: Record<string, any>
  ): ValidationError {
    const message = `Invalid ${field}: ${reason}`;
    return new ValidationError(message, field, value, context);
  }
}

/**
 * Simulation-related errors
 */
export class SimulationError extends HyperSimError {
  public readonly transactionHash: string;
  public readonly gasUsed: number;

  constructor(
    message: string,
    transactionHash: string = '',
    gasUsed: number = 0,
    context: Record<string, any> = {}
  ) {
    super(message, 'SIMULATION_ERROR', context);
    this.name = 'SimulationError';
    this.transactionHash = transactionHash;
    this.gasUsed = gasUsed;
    Object.setPrototypeOf(this, SimulationError.prototype);
  }
}

/**
 * WebSocket-related errors
 */
export class WebSocketError extends HyperSimError {
  public readonly connectionState: string;
  public readonly closeCode: number;

  constructor(
    message: string,
    connectionState: string = 'unknown',
    closeCode: number = 0,
    context: Record<string, any> = {}
  ) {
    super(message, 'WEBSOCKET_ERROR', context);
    this.name = 'WebSocketError';
    this.connectionState = connectionState;
    this.closeCode = closeCode;
    Object.setPrototypeOf(this, WebSocketError.prototype);
  }
}

/**
 * Plugin-related errors
 */
export class PluginError extends HyperSimError {
  public readonly pluginName: string;
  public readonly pluginVersion: string;

  constructor(
    message: string,
    pluginName: string = 'unknown',
    pluginVersion: string = '0.0.0',
    context: Record<string, any> = {}
  ) {
    super(message, 'PLUGIN_ERROR', context);
    this.name = 'PluginError';
    this.pluginName = pluginName;
    this.pluginVersion = pluginVersion;
    Object.setPrototypeOf(this, PluginError.prototype);
  }
}

/**
 * AI-related errors
 */
export class AIError extends HyperSimError {
  public readonly provider: string;
  public readonly model: string;

  constructor(
    message: string,
    provider: string = 'unknown',
    model: string = 'unknown',
    context: Record<string, any> = {}
  ) {
    super(message, 'AI_ERROR', context);
    this.name = 'AIError';
    this.provider = provider;
    this.model = model;
    Object.setPrototypeOf(this, AIError.prototype);
  }
}

/**
 * Rate limiting errors
 */
export class RateLimitError extends HyperSimError {
  public readonly retryAfter: number;
  public readonly limit: number;
  public readonly remaining: number;

  constructor(
    message: string,
    retryAfter: number = 0,
    limit: number = 0,
    remaining: number = 0,
    context: Record<string, any> = {}
  ) {
    super(message, 'RATE_LIMIT_ERROR', context);
    this.name = 'RateLimitError';
    this.retryAfter = retryAfter;
    this.limit = limit;
    this.remaining = remaining;
    Object.setPrototypeOf(this, RateLimitError.prototype);
  }
}

/**
 * Timeout errors
 */
export class TimeoutError extends HyperSimError {
  public readonly timeout: number;
  public readonly operation: string;

  constructor(
    operation: string,
    timeout: number,
    context?: Record<string, any>
  ) {
    const message = `Operation '${operation}' timed out after ${timeout}ms`;
    super(message, 'TIMEOUT_ERROR', context);
    this.name = 'TimeoutError';
    this.timeout = timeout;
    this.operation = operation;
    Object.setPrototypeOf(this, TimeoutError.prototype);
  }
}

/**
 * Cross-layer integration errors
 */
export class CrossLayerError extends HyperSimError {
  public readonly layer: 'hyperevm' | 'hypercore';
  public readonly precompileAddress?: string;

  constructor(
    message: string,
    layer: 'hyperevm' | 'hypercore',
    precompileAddress?: string,
    context?: Record<string, any>
  ) {
    super(message, 'CROSS_LAYER_ERROR', context);
    this.name = 'CrossLayerError';
    this.layer = layer;
    this.precompileAddress = precompileAddress;
    Object.setPrototypeOf(this, CrossLayerError.prototype);
  }
}

/**
 * Configuration errors
 */
export class ConfigurationError extends HyperSimError {
  public readonly configKey?: string;

  constructor(
    message: string,
    configKey?: string,
    context?: Record<string, any>
  ) {
    super(message, 'CONFIGURATION_ERROR', context);
    this.name = 'ConfigurationError';
    this.configKey = configKey;
    Object.setPrototypeOf(this, ConfigurationError.prototype);
  }
}

/**
 * Error factory for creating typed errors
 */
export class ErrorFactory {
  /**
   * Create appropriate error type based on error characteristics
   */
  public static fromUnknown(error: unknown, context?: Record<string, any>): HyperSimError {
    if (error instanceof HyperSimError) {
      return context ? error.withContext(context) : error;
    }

    if (error instanceof Error) {
      // Try to categorize the error based on its message or properties
      const message = error.message.toLowerCase();
      
      if (message.includes('timeout') || message.includes('timed out')) {
        return new TimeoutError('Unknown operation', 0, context);
      }
      
      if (message.includes('network') || message.includes('connection')) {
        return new NetworkError(error.message, context);
      }
      
      if (message.includes('validation') || message.includes('invalid')) {
        return new ValidationError(error.message, undefined, undefined, context);
      }
      
      if (message.includes('rate limit') || message.includes('too many requests')) {
        return new RateLimitError(error.message, undefined, undefined, undefined, context);
      }

      // Default to generic HyperSimError
      return new HyperSimError(error.message, 'UNKNOWN_ERROR', {
        originalError: error.name,
        ...context
      });
    }

    // Handle non-Error objects
    const message = typeof error === 'string' 
      ? error 
      : 'An unknown error occurred';
      
    return new HyperSimError(message, 'UNKNOWN_ERROR', {
      originalError: error,
      ...context
    });
  }

  /**
   * Create network error with retry information
   */
  public static networkError(
    message: string,
    url?: string,
    statusCode?: number,
    retryAttempt?: number
  ): NetworkError {
    return new NetworkError(message, {
      url,
      statusCode,
      retryAttempt
    });
  }

  /**
   * Create timeout error for specific operation
   */
  public static timeout(operation: string, timeout: number): TimeoutError {
    return new TimeoutError(operation, timeout);
  }

  /**
   * Create validation error with field details
   */
  public static validation(
    field: string,
    value: any,
    reason: string
  ): ValidationError {
    return ValidationError.forField(field, value, reason);
  }
}

/**
 * Error utilities
 */
export class ErrorUtils {
  /**
   * Check if error is retryable
   */
  public static isRetryable(error: Error): boolean {
    if (error instanceof NetworkError) {
      return true;
    }
    
    if (error instanceof APIError) {
      // Retry on 5xx errors and some 4xx errors
      return error.statusCode ? error.statusCode >= 500 || error.statusCode === 408 || error.statusCode === 429 : false;
    }
    
    if (error instanceof TimeoutError) {
      return true;
    }
    
    if (error instanceof RateLimitError) {
      return true;
    }
    
    return false;
  }

  /**
   * Get retry delay for error
   */
  public static getRetryDelay(error: Error, attempt: number, baseDelay: number = 1000): number {
    if (error instanceof RateLimitError && error.retryAfter) {
      return error.retryAfter * 1000; // Convert to milliseconds
    }
    
    // Exponential backoff with jitter
    const delay = baseDelay * Math.pow(2, attempt - 1);
    const jitter = delay * 0.1 * Math.random();
    return Math.min(delay + jitter, 30000); // Cap at 30 seconds
  }

  /**
   * Extract error context for logging
   */
  public static getContext(error: Error): Record<string, any> {
    if (error instanceof HyperSimError) {
      return {
        name: error.name,
        code: error.code,
        timestamp: error.timestamp,
        context: error.context
      };
    }
    
    return {
      name: error.name,
      message: error.message,
      stack: error.stack
    };
  }

  /**
   * Format error for user display
   */
  public static formatForUser(error: Error): string {
    if (error instanceof ValidationError) {
      return error.message;
    }
    
    if (error instanceof NetworkError) {
      return 'Network connection failed. Please check your internet connection and try again.';
    }
    
    if (error instanceof APIError) {
      if (error.statusCode === 429) {
        return 'Rate limit exceeded. Please wait a moment and try again.';
      }
      return 'API request failed. Please try again later.';
    }
    
    if (error instanceof TimeoutError) {
      return 'Request timed out. Please try again.';
    }
    
    return 'An unexpected error occurred. Please try again.';
  }
}
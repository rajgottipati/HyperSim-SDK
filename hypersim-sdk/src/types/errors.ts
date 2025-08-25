/**
 * Error types and custom exceptions
 */

/**
 * Base error class for all SDK errors
 */
export abstract class HyperSimError extends Error {
  /** Error code for programmatic handling */
  public readonly code: string;
  /** Additional error details */
  public readonly details?: Record<string, any>;
  /** Error timestamp */
  public readonly timestamp: number;

  constructor(message: string, code: string, details?: Record<string, any>) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.details = details;
    this.timestamp = Date.now();
    
    // Maintain proper stack trace
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }

  /**
   * Convert error to JSON for logging/debugging
   */
  toJSON(): Record<string, any> {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      details: this.details,
      timestamp: this.timestamp,
      stack: this.stack,
    };
  }
}

/**
 * Validation error for invalid inputs
 */
export class ValidationError extends HyperSimError {
  constructor(message: string, details?: Record<string, any>) {
    super(message, 'VALIDATION_ERROR', details);
  }
}

/**
 * Network-related errors
 */
export class NetworkError extends HyperSimError {
  constructor(message: string, details?: Record<string, any>) {
    super(message, 'NETWORK_ERROR', details);
  }
}

/**
 * Simulation-related errors
 */
export class SimulationError extends HyperSimError {
  constructor(message: string, details?: Record<string, any>) {
    super(message, 'SIMULATION_ERROR', details);
  }
}

/**
 * AI analysis errors
 */
export class AIAnalysisError extends HyperSimError {
  constructor(message: string, details?: Record<string, any>) {
    super(message, 'AI_ANALYSIS_ERROR', details);
  }
}

/**
 * Configuration errors
 */
export class ConfigurationError extends HyperSimError {
  constructor(message: string, details?: Record<string, any>) {
    super(message, 'CONFIGURATION_ERROR', details);
  }
}

/**
 * Rate limiting errors
 */
export class RateLimitError extends HyperSimError {
  /** Retry after seconds */
  public readonly retryAfter: number;

  constructor(message: string, retryAfter: number = 60, details?: Record<string, any>) {
    super(message, 'RATE_LIMIT_ERROR', { ...details, retryAfter });
    this.retryAfter = retryAfter;
  }
}

/**
 * Timeout errors
 */
export class TimeoutError extends HyperSimError {
  constructor(message: string, timeout: number, details?: Record<string, any>) {
    super(message, 'TIMEOUT_ERROR', { ...details, timeout });
  }
}

/**
 * Authentication/authorization errors
 */
export class AuthError extends HyperSimError {
  constructor(message: string, details?: Record<string, any>) {
    super(message, 'AUTH_ERROR', details);
  }
}

/**
 * Insufficient funds error
 */
export class InsufficientFundsError extends SimulationError {
  /** Required amount */
  public readonly required: string;
  /** Available amount */
  public readonly available: string;

  constructor(required: string, available: string, details?: Record<string, any>) {
    super(
      `Insufficient funds: required ${required}, available ${available}`,
      { ...details, required, available }
    );
    this.required = required;
    this.available = available;
  }
}

/**
 * Transaction revert error
 */
export class TransactionRevertError extends SimulationError {
  /** Revert reason */
  public readonly revertReason: string;

  constructor(revertReason: string, details?: Record<string, any>) {
    super(`Transaction reverted: ${revertReason}`, { ...details, revertReason });
    this.revertReason = revertReason;
  }
}

/**
 * Gas limit exceeded error
 */
export class GasLimitExceededError extends SimulationError {
  /** Gas limit */
  public readonly gasLimit: string;
  /** Gas required */
  public readonly gasRequired: string;

  constructor(gasLimit: string, gasRequired: string, details?: Record<string, any>) {
    super(
      `Gas limit exceeded: limit ${gasLimit}, required ${gasRequired}`,
      { ...details, gasLimit, gasRequired }
    );
    this.gasLimit = gasLimit;
    this.gasRequired = gasRequired;
  }
}

/**
 * Error code enumeration for easy reference
 */
export enum ErrorCode {
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  NETWORK_ERROR = 'NETWORK_ERROR',
  SIMULATION_ERROR = 'SIMULATION_ERROR',
  AI_ANALYSIS_ERROR = 'AI_ANALYSIS_ERROR',
  CONFIGURATION_ERROR = 'CONFIGURATION_ERROR',
  RATE_LIMIT_ERROR = 'RATE_LIMIT_ERROR',
  TIMEOUT_ERROR = 'TIMEOUT_ERROR',
  AUTH_ERROR = 'AUTH_ERROR',
}

/**
 * Helper function to check if an error is a HyperSim SDK error
 */
export function isHyperSimError(error: any): error is HyperSimError {
  return error instanceof HyperSimError;
}

/**
 * Helper function to create error from unknown error type
 */
export function createErrorFromUnknown(error: unknown, code: string = 'UNKNOWN_ERROR'): HyperSimError {
  if (error instanceof HyperSimError) {
    return error;
  }
  
  if (error instanceof Error) {
    return new HyperSimError(error.message, code, { originalError: error.name });
  }
  
  return new HyperSimError(
    typeof error === 'string' ? error : 'Unknown error occurred',
    code,
    { originalError: error }
  );
}
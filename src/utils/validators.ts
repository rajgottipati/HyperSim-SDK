/**
 * Validation utilities for HyperSim SDK
 * Provides type-safe validation for addresses, transactions, and data structures
 */

import { HyperEVMTransaction, BlockType } from '../types/hyperevm.js';
import { SimulateOptions, HyperSimNetwork } from '../types/common.js';
import { ValidationError } from '../core/errors.js';

/**
 * Validates Ethereum-style addresses
 */
export function validateAddress(address: string): boolean {
  if (!address || typeof address !== 'string') {
    return false;
  }
  
  // Check if it's a valid hex string with proper length
  const addressRegex = /^0x[a-fA-F0-9]{40}$/;
  return addressRegex.test(address);
}

/**
 * Validates and throws if address is invalid
 */
export function assertValidAddress(address: string, context?: string): void {
  if (!validateAddress(address)) {
    throw new ValidationError(
      `Invalid address${context ? ` for ${context}` : ''}: ${address}. Expected a valid Ethereum address (0x + 40 hex characters).`
    );
  }
}

/**
 * Validates transaction hash
 */
export function validateTransactionHash(hash: string): boolean {
  if (!hash || typeof hash !== 'string') {
    return false;
  }
  
  const hashRegex = /^0x[a-fA-F0-9]{64}$/;
  return hashRegex.test(hash);
}

/**
 * Validates hex string with optional length
 */
export function validateHexString(value: string, expectedLength?: number): boolean {
  if (!value || typeof value !== 'string') {
    return false;
  }
  
  if (!value.startsWith('0x')) {
    return false;
  }
  
  const hexPart = value.slice(2);
  const hexRegex = /^[a-fA-F0-9]*$/;
  
  if (!hexRegex.test(hexPart)) {
    return false;
  }
  
  if (expectedLength && hexPart.length !== expectedLength) {
    return false;
  }
  
  return true;
}

/**
 * Validates numeric string (for amounts, prices, etc.)
 */
export function validateNumericString(value: string): boolean {
  if (!value || typeof value !== 'string') {
    return false;
  }
  
  // Allow decimal numbers
  const numericRegex = /^\d+(\.\d+)?$/;
  return numericRegex.test(value) && !isNaN(Number(value));
}

/**
 * Validates positive numeric string
 */
export function validatePositiveNumericString(value: string): boolean {
  return validateNumericString(value) && Number(value) > 0;
}

/**
 * Validates network name
 */
export function validateNetwork(network: string): network is HyperSimNetwork {
  return network === 'mainnet' || network === 'testnet';
}

/**
 * Validates block type for dual-block architecture
 */
export function validateBlockType(blockType: string): blockType is BlockType {
  return blockType === 'small' || blockType === 'large';
}

/**
 * Validates HyperEVM transaction structure
 */
export function validateTransaction(transaction: Partial<HyperEVMTransaction>): ValidationError[] {
  const errors: ValidationError[] = [];
  
  // Required fields
  if (!transaction.from) {
    errors.push(new ValidationError('Transaction must include "from" address'));
  } else if (!validateAddress(transaction.from)) {
    errors.push(new ValidationError(`Invalid "from" address: ${transaction.from}`));
  }
  
  // Optional "to" field validation
  if (transaction.to && !validateAddress(transaction.to)) {
    errors.push(new ValidationError(`Invalid "to" address: ${transaction.to}`));
  }
  
  // Value validation
  if (transaction.value && !validateNumericString(transaction.value)) {
    errors.push(new ValidationError(`Invalid "value": ${transaction.value}. Must be a valid numeric string.`));
  }
  
  // Gas validation
  if (transaction.gas && (!validateNumericString(transaction.gas) || Number(transaction.gas) <= 0)) {
    errors.push(new ValidationError(`Invalid "gas": ${transaction.gas}. Must be a positive numeric string.`));
  }
  
  // Gas price validation
  if (transaction.gasPrice && !validatePositiveNumericString(transaction.gasPrice)) {
    errors.push(new ValidationError(`Invalid "gasPrice": ${transaction.gasPrice}. Must be a positive numeric string.`));
  }
  
  // Data validation (if present)
  if (transaction.data && !validateHexString(transaction.data)) {
    errors.push(new ValidationError(`Invalid "data": ${transaction.data}. Must be a valid hex string.`));
  }
  
  // Nonce validation
  if (transaction.nonce !== undefined && (!Number.isInteger(transaction.nonce) || transaction.nonce < 0)) {
    errors.push(new ValidationError(`Invalid "nonce": ${transaction.nonce}. Must be a non-negative integer.`));
  }
  
  // Chain ID validation
  if (transaction.chainId !== undefined) {
    if (!Number.isInteger(transaction.chainId) || transaction.chainId <= 0) {
      errors.push(new ValidationError(`Invalid "chainId": ${transaction.chainId}. Must be a positive integer.`));
    }
  }
  
  return errors;
}

/**
 * Validates simulation options
 */
export function validateSimulateOptions(options: SimulateOptions): ValidationError[] {
  const errors: ValidationError[] = [];
  
  if (!options.transaction) {
    errors.push(new ValidationError('SimulateOptions must include "transaction" field'));
    return errors;
  }
  
  // Validate the transaction itself
  const transactionErrors = validateTransaction(options.transaction);
  errors.push(...transactionErrors);
  
  // Validate block number if provided
  if (options.blockNumber !== undefined) {
    if (typeof options.blockNumber === 'string') {
      const validBlockTags = ['latest', 'earliest', 'pending'];
      if (!validBlockTags.includes(options.blockNumber) && !validateHexString(options.blockNumber)) {
        errors.push(new ValidationError(
          `Invalid "blockNumber": ${options.blockNumber}. Must be 'latest', 'earliest', 'pending', or a valid hex string.`
        ));
      }
    } else if (typeof options.blockNumber === 'number') {
      if (!Number.isInteger(options.blockNumber) || options.blockNumber < 0) {
        errors.push(new ValidationError(
          `Invalid "blockNumber": ${options.blockNumber}. Must be a non-negative integer.`
        ));
      }
    }
  }
  
  return errors;
}

/**
 * Validates coin symbol/asset name
 */
export function validateCoinSymbol(coin: string): boolean {
  if (!coin || typeof coin !== 'string') {
    return false;
  }
  
  // Allow alphanumeric characters, max length 10
  const coinRegex = /^[A-Za-z0-9]{1,10}$/;
  return coinRegex.test(coin);
}

/**
 * Validates URL format
 */
export function validateUrl(url: string): boolean {
  if (!url || typeof url !== 'string') {
    return false;
  }
  
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

/**
 * Validates WebSocket URL format
 */
export function validateWebSocketUrl(url: string): boolean {
  return validateUrl(url) && (url.startsWith('ws://') || url.startsWith('wss://'));
}

/**
 * Validates nonce within HyperEVM constraints
 * HyperEVM accepts only the next 8 nonces per address
 */
export function validateNonceRange(currentNonce: number, targetNonce: number): boolean {
  return targetNonce >= currentNonce && targetNonce < currentNonce + 8;
}

/**
 * Validates gas limit for block type
 */
export function validateGasForBlockType(gasLimit: number, blockType: BlockType): boolean {
  if (blockType === 'small') {
    return gasLimit <= 2000000; // 2M gas limit for small blocks
  } else if (blockType === 'large') {
    return gasLimit <= 30000000; // 30M gas limit for large blocks
  }
  return false;
}

/**
 * Validates plugin configuration
 */
export function validatePluginName(name: string): boolean {
  if (!name || typeof name !== 'string') {
    return false;
  }
  
  // Allow letters, numbers, hyphens, and underscores
  const nameRegex = /^[a-zA-Z0-9_-]+$/;
  return nameRegex.test(name) && name.length >= 1 && name.length <= 50;
}

/**
 * Validates subscription type for WebSocket
 */
export function validateSubscriptionType(type: string): boolean {
  const validTypes = ['trades', 'l2Book', 'candle', 'userEvents', 'userFills', 'userPositions'];
  return validTypes.includes(type);
}

/**
 * Validates candle interval
 */
export function validateCandleInterval(interval: string): boolean {
  const validIntervals = ['1m', '15m', '1h', '4h', '1d'];
  return validIntervals.includes(interval);
}

/**
 * Comprehensive validation wrapper that throws on first error
 */
export function assertValid<T>(
  value: T,
  validator: (value: T) => boolean,
  errorMessage: string
): void {
  if (!validator(value)) {
    throw new ValidationError(errorMessage);
  }
}

/**
 * Validates and sanitizes user input
 */
export function sanitizeInput(input: string, maxLength: number = 1000): string {
  if (!input || typeof input !== 'string') {
    return '';
  }
  
  // Remove control characters and limit length
  return input
    .replace(/[\x00-\x1F\x7F]/g, '') // Remove control characters
    .slice(0, maxLength)
    .trim();
}

/**
 * Validates rate limit configuration
 */
export function validateRateLimitConfig(config: {
  requestsPerSecond: number;
  burstSize: number;
  windowMs: number;
}): boolean {
  return (
    Number.isInteger(config.requestsPerSecond) &&
    config.requestsPerSecond > 0 &&
    Number.isInteger(config.burstSize) &&
    config.burstSize > 0 &&
    Number.isInteger(config.windowMs) &&
    config.windowMs > 0
  );
}
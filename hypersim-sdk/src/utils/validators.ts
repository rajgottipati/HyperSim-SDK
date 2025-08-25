/**
 * Validation utilities for SDK inputs
 */

import { Network } from '../types/network';
import { TransactionRequest } from '../types/simulation';
import { ValidationError } from '../types/errors';

/**
 * Validate network parameter
 */
export function validateNetwork(network: Network): void {
  if (!Object.values(Network).includes(network)) {
    throw new ValidationError(
      `Invalid network: ${network}. Must be one of: ${Object.values(Network).join(', ')}`
    );
  }
}

/**
 * Validate Ethereum address format
 */
export function validateAddress(address: string, fieldName: string = 'address'): void {
  if (!address) {
    throw new ValidationError(`${fieldName} is required`);
  }
  
  if (typeof address !== 'string') {
    throw new ValidationError(`${fieldName} must be a string`);
  }
  
  if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
    throw new ValidationError(`${fieldName} must be a valid Ethereum address (0x followed by 40 hex characters)`);
  }
}

/**
 * Validate hex string
 */
export function validateHexString(value: string, fieldName: string = 'value'): void {
  if (!value) {
    throw new ValidationError(`${fieldName} is required`);
  }
  
  if (typeof value !== 'string') {
    throw new ValidationError(`${fieldName} must be a string`);
  }
  
  if (!value.startsWith('0x')) {
    throw new ValidationError(`${fieldName} must start with '0x'`);
  }
  
  if (!/^0x[a-fA-F0-9]*$/.test(value)) {
    throw new ValidationError(`${fieldName} must be a valid hex string`);
  }
}

/**
 * Validate numeric string (for wei amounts, gas, etc.)
 */
export function validateNumericString(value: string, fieldName: string = 'value'): void {
  if (!value) {
    throw new ValidationError(`${fieldName} is required`);
  }
  
  if (typeof value !== 'string') {
    throw new ValidationError(`${fieldName} must be a string`);
  }
  
  if (!/^\d+$/.test(value)) {
    throw new ValidationError(`${fieldName} must be a numeric string (digits only)`);
  }
  
  // Check for reasonable bounds
  const num = BigInt(value);
  if (num < 0n) {
    throw new ValidationError(`${fieldName} must be non-negative`);
  }
}

/**
 * Validate transaction request
 */
export function validateTransactionRequest(tx: TransactionRequest): void {
  if (!tx) {
    throw new ValidationError('Transaction request is required');
  }
  
  // Validate required fields
  validateAddress(tx.from, 'from');
  
  // Validate optional fields if present
  if (tx.to) {
    validateAddress(tx.to, 'to');
  }
  
  if (tx.value) {
    validateNumericString(tx.value, 'value');
  }
  
  if (tx.data) {
    validateHexString(tx.data, 'data');
  }
  
  if (tx.gasLimit) {
    validateNumericString(tx.gasLimit, 'gasLimit');
    const gasLimit = BigInt(tx.gasLimit);
    if (gasLimit > 30_000_000n) {
      throw new ValidationError('gasLimit exceeds maximum block gas limit (30M)');
    }
  }
  
  if (tx.gasPrice) {
    validateNumericString(tx.gasPrice, 'gasPrice');
  }
  
  if (tx.maxFeePerGas) {
    validateNumericString(tx.maxFeePerGas, 'maxFeePerGas');
  }
  
  if (tx.maxPriorityFeePerGas) {
    validateNumericString(tx.maxPriorityFeePerGas, 'maxPriorityFeePerGas');
  }
  
  if (tx.nonce !== undefined) {
    if (typeof tx.nonce !== 'number' || tx.nonce < 0 || !Number.isInteger(tx.nonce)) {
      throw new ValidationError('nonce must be a non-negative integer');
    }
  }
  
  if (tx.type !== undefined) {
    if (![0, 1, 2].includes(tx.type)) {
      throw new ValidationError('type must be 0, 1, or 2');
    }
  }
  
  // EIP-1559 validation
  if (tx.type === 2 || (tx.maxFeePerGas || tx.maxPriorityFeePerGas)) {
    if (!tx.maxFeePerGas || !tx.maxPriorityFeePerGas) {
      throw new ValidationError('Both maxFeePerGas and maxPriorityFeePerGas are required for EIP-1559 transactions');
    }
    
    if (tx.gasPrice) {
      throw new ValidationError('gasPrice should not be used with EIP-1559 transactions');
    }
    
    const maxFee = BigInt(tx.maxFeePerGas);
    const maxPriority = BigInt(tx.maxPriorityFeePerGas);
    
    if (maxPriority > maxFee) {
      throw new ValidationError('maxPriorityFeePerGas cannot be greater than maxFeePerGas');
    }
  }
}

/**
 * Validate API key format
 */
export function validateApiKey(apiKey: string, provider: string = 'API'): void {
  if (!apiKey) {
    throw new ValidationError(`${provider} key is required`);
  }
  
  if (typeof apiKey !== 'string') {
    throw new ValidationError(`${provider} key must be a string`);
  }
  
  if (apiKey.length < 10) {
    throw new ValidationError(`${provider} key appears to be too short`);
  }
}

/**
 * Validate timeout value
 */
export function validateTimeout(timeout: number): void {
  if (typeof timeout !== 'number') {
    throw new ValidationError('Timeout must be a number');
  }
  
  if (timeout < 1000) {
    throw new ValidationError('Timeout must be at least 1000ms');
  }
  
  if (timeout > 300000) {
    throw new ValidationError('Timeout cannot exceed 300000ms (5 minutes)');
  }
}

/**
 * Validate array of transactions
 */
export function validateTransactionArray(transactions: TransactionRequest[]): void {
  if (!Array.isArray(transactions)) {
    throw new ValidationError('Transactions must be an array');
  }
  
  if (transactions.length === 0) {
    throw new ValidationError('Transaction array cannot be empty');
  }
  
  if (transactions.length > 100) {
    throw new ValidationError('Cannot simulate more than 100 transactions at once');
  }
  
  transactions.forEach((tx, index) => {
    try {
      validateTransactionRequest(tx);
    } catch (error) {
      if (error instanceof ValidationError) {
        throw new ValidationError(`Transaction at index ${index}: ${error.message}`);
      }
      throw error;
    }
  });
}

/**
 * Validate percentage value (0-100)
 */
export function validatePercentage(value: number, fieldName: string = 'percentage'): void {
  if (typeof value !== 'number') {
    throw new ValidationError(`${fieldName} must be a number`);
  }
  
  if (value < 0 || value > 100) {
    throw new ValidationError(`${fieldName} must be between 0 and 100`);
  }
}

/**
 * Validate confidence score (0-1)
 */
export function validateConfidence(confidence: number): void {
  if (typeof confidence !== 'number') {
    throw new ValidationError('Confidence must be a number');
  }
  
  if (confidence < 0 || confidence > 1) {
    throw new ValidationError('Confidence must be between 0 and 1');
  }
}

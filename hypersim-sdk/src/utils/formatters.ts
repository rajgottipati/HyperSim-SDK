/**
 * Formatting utilities for SDK data
 */

import { ethers } from 'ethers';
import { TransactionRequest } from '../types/simulation';
import { NetworkConfig } from '../types/network';

/**
 * Format transaction request for ethers.js
 */
export function formatTransactionRequest(tx: TransactionRequest): {
  from: string;
  to?: string;
  value?: string;
  data?: string;
  gasLimit?: string;
  gasPrice?: string;
  maxFeePerGas?: string;
  maxPriorityFeePerGas?: string;
  nonce?: number;
  type?: number;
} {
  const formatted: any = {
    from: tx.from,
  };

  if (tx.to) formatted.to = tx.to;
  if (tx.value) formatted.value = tx.value;
  if (tx.data) formatted.data = tx.data;
  if (tx.gasLimit) formatted.gasLimit = tx.gasLimit;
  if (tx.gasPrice) formatted.gasPrice = tx.gasPrice;
  if (tx.maxFeePerGas) formatted.maxFeePerGas = tx.maxFeePerGas;
  if (tx.maxPriorityFeePerGas) formatted.maxPriorityFeePerGas = tx.maxPriorityFeePerGas;
  if (tx.nonce !== undefined) formatted.nonce = tx.nonce;
  if (tx.type !== undefined) formatted.type = tx.type;

  return formatted;
}

/**
 * Format wei amount to human-readable string
 */
export function formatWeiToEther(wei: string | bigint, decimals: number = 4): string {
  try {
    const etherAmount = ethers.formatEther(wei.toString());
    const num = parseFloat(etherAmount);
    return num.toFixed(decimals);
  } catch {
    return '0.0000';
  }
}

/**
 * Format wei amount to Gwei
 */
export function formatWeiToGwei(wei: string | bigint, decimals: number = 2): string {
  try {
    const gweiAmount = ethers.formatUnits(wei.toString(), 'gwei');
    const num = parseFloat(gweiAmount);
    return num.toFixed(decimals);
  } catch {
    return '0.00';
  }
}

/**
 * Format ether amount to wei
 */
export function formatEtherToWei(ether: string | number): string {
  try {
    return ethers.parseEther(ether.toString()).toString();
  } catch {
    return '0';
  }
}

/**
 * Format Gwei to wei
 */
export function formatGweiToWei(gwei: string | number): string {
  try {
    return ethers.parseUnits(gwei.toString(), 'gwei').toString();
  } catch {
    return '0';
  }
}

/**
 * Format gas amount with commas
 */
export function formatGas(gas: string | number | bigint): string {
  try {
    const gasNumber = typeof gas === 'bigint' ? Number(gas) : Number(gas);
    return gasNumber.toLocaleString();
  } catch {
    return '0';
  }
}

/**
 * Format address for display (show first 6 and last 4 characters)
 */
export function formatAddress(address: string): string {
  if (!address || address.length !== 42) {
    return address;
  }
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

/**
 * Format transaction hash for display
 */
export function formatTxHash(hash: string): string {
  if (!hash || hash.length !== 66) {
    return hash;
  }
  return `${hash.slice(0, 8)}...${hash.slice(-6)}`;
}

/**
 * Format timestamp to readable date
 */
export function formatTimestamp(timestamp: number): string {
  try {
    return new Date(timestamp * 1000).toLocaleString();
  } catch {
    return 'Invalid Date';
  }
}

/**
 * Format duration in milliseconds to human readable
 */
export function formatDuration(ms: number): string {
  if (ms < 1000) {
    return `${ms}ms`;
  }
  
  const seconds = ms / 1000;
  if (seconds < 60) {
    return `${seconds.toFixed(1)}s`;
  }
  
  const minutes = seconds / 60;
  if (minutes < 60) {
    return `${minutes.toFixed(1)}m`;
  }
  
  const hours = minutes / 60;
  return `${hours.toFixed(1)}h`;
}

/**
 * Format percentage
 */
export function formatPercentage(value: number, decimals: number = 2): string {
  return `${value.toFixed(decimals)}%`;
}

/**
 * Format large numbers with appropriate units (K, M, B)
 */
export function formatLargeNumber(num: number, decimals: number = 2): string {
  if (num >= 1_000_000_000) {
    return `${(num / 1_000_000_000).toFixed(decimals)}B`;
  }
  if (num >= 1_000_000) {
    return `${(num / 1_000_000).toFixed(decimals)}M`;
  }
  if (num >= 1_000) {
    return `${(num / 1_000).toFixed(decimals)}K`;
  }
  return num.toFixed(decimals);
}

/**
 * Format risk level to display color/style
 */
export function formatRiskLevel(riskLevel: 'LOW' | 'MEDIUM' | 'HIGH'): {
  text: string;
  color: string;
  emoji: string;
} {
  switch (riskLevel) {
    case 'LOW':
      return { text: 'Low Risk', color: 'green', emoji: '🟢' };
    case 'MEDIUM':
      return { text: 'Medium Risk', color: 'yellow', emoji: '🟡' };
    case 'HIGH':
      return { text: 'High Risk', color: 'red', emoji: '🔴' };
  }
}

/**
 * Format block type to display
 */
export function formatBlockType(blockType: 'small' | 'large'): {
  text: string;
  description: string;
  emoji: string;
} {
  switch (blockType) {
    case 'small':
      return {
        text: 'Small Block',
        description: '2M gas limit, ~1 second',
        emoji: '⚡'
      };
    case 'large':
      return {
        text: 'Large Block',
        description: '30M gas limit, ~1 minute',
        emoji: '🧱'
      };
  }
}

/**
 * Format network name for display
 */
export function formatNetworkName(network: string): string {
  switch (network.toLowerCase()) {
    case 'mainnet':
      return 'HyperEVM Mainnet';
    case 'testnet':
      return 'HyperEVM Testnet';
    default:
      return network;
  }
}

/**
 * Format API response for consistent structure
 */
export function formatApiResponse<T>(data: T, success: boolean = true, error?: string): {
  data: T;
  success: boolean;
  error?: string;
  timestamp: number;
} {
  return {
    data,
    success,
    error,
    timestamp: Date.now(),
  };
}

/**
 * Format hex data for display (limit length and add ellipsis)
 */
export function formatHexData(data: string, maxLength: number = 20): string {
  if (!data || !data.startsWith('0x')) {
    return data;
  }
  
  if (data.length <= maxLength + 2) {
    return data;
  }
  
  return `${data.slice(0, maxLength + 2)}...`;
}

/**
 * Format JSON for pretty printing
 */
export function formatJSON(obj: any, indent: number = 2): string {
  try {
    return JSON.stringify(obj, null, indent);
  } catch {
    return String(obj);
  }
}

/**
 * Format file size in bytes to human readable
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

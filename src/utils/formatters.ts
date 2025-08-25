/**
 * Formatting utilities for HyperSim SDK
 * Handles data transformation, serialization, and display formatting
 */

import { TradeData, OrderBookData, CandleData, UserFillData } from '../types/common.js';
import { PerpPosition, SpotBalance, PriceData } from '../types/hypercore.js';
import { HyperEVMTransaction, TransactionReceipt, Block } from '../types/hyperevm.js';

/**
 * Formats addresses to standard checksum format
 */
export function formatAddress(address: string): string {
  if (!address || !address.startsWith('0x')) {
    return address;
  }
  
  // Simple checksum implementation
  const addr = address.toLowerCase().slice(2);
  let result = '0x';
  
  for (let i = 0; i < addr.length; i++) {
    const char = addr[i];
    if (parseInt(char, 16) >= 10) {
      // For simplicity, always use lowercase for hex letters
      // In a production implementation, you'd use proper EIP-55 checksum
      result += char.toLowerCase();
    } else {
      result += char;
    }
  }
  
  return result;
}

/**
 * Formats wei values to human-readable format
 */
export function formatWei(wei: string | number, decimals: number = 18, precision: number = 4): string {
  const weiValue = typeof wei === 'string' ? BigInt(wei) : BigInt(wei);
  const divisor = BigInt(10) ** BigInt(decimals);
  
  const integerPart = weiValue / divisor;
  const fractionalPart = weiValue % divisor;
  
  if (fractionalPart === BigInt(0)) {
    return integerPart.toString();
  }
  
  const fractionalStr = fractionalPart.toString().padStart(decimals, '0');
  const trimmedFractional = fractionalStr.slice(0, precision).replace(/0+$/, '');
  
  if (trimmedFractional === '') {
    return integerPart.toString();
  }
  
  return `${integerPart.toString()}.${trimmedFractional}`;
}

/**
 * Formats gas values with proper units
 */
export function formatGas(gas: number | string): string {
  const gasNum = typeof gas === 'string' ? parseInt(gas, 10) : gas;
  
  if (gasNum >= 1000000) {
    return `${(gasNum / 1000000).toFixed(2)}M`;
  } else if (gasNum >= 1000) {
    return `${(gasNum / 1000).toFixed(1)}K`;
  } else {
    return gasNum.toString();
  }
}

/**
 * Formats USD amounts with proper precision
 */
export function formatUSD(amount: string | number, precision: number = 2): string {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  
  if (isNaN(num)) {
    return '$0.00';
  }
  
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: precision,
    maximumFractionDigits: precision
  }).format(num);
}

/**
 * Formats percentages
 */
export function formatPercentage(value: string | number, precision: number = 2): string {
  const num = typeof value === 'string' ? parseFloat(value) : value;
  
  if (isNaN(num)) {
    return '0%';
  }
  
  return `${(num * 100).toFixed(precision)}%`;
}

/**
 * Formats timestamps to human-readable format
 */
export function formatTimestamp(timestamp: number, includeTime: boolean = true): string {
  const date = new Date(timestamp);
  
  const options: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  };
  
  if (includeTime) {
    options.hour = '2-digit';
    options.minute = '2-digit';
    options.second = '2-digit';
    options.timeZoneName = 'short';
  }
  
  return new Intl.DateTimeFormat('en-US', options).format(date);
}

/**
 * Formats time duration in milliseconds to human-readable format
 */
export function formatDuration(durationMs: number): string {
  const seconds = Math.floor(durationMs / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  
  if (days > 0) {
    return `${days}d ${hours % 24}h`;
  } else if (hours > 0) {
    return `${hours}h ${minutes % 60}m`;
  } else if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`;
  } else {
    return `${seconds}s`;
  }
}

/**
 * Formats position data for display
 */
export function formatPosition(position: PerpPosition): {
  coin: string;
  size: string;
  entryPrice: string;
  unrealizedPnl: string;
  leverage: string;
  liquidationPrice: string;
} {
  return {
    coin: position.coin,
    size: formatWei(position.szi, 6, 4),
    entryPrice: position.entryPx ? formatUSD(position.entryPx, 4) : 'N/A',
    unrealizedPnl: formatUSD(position.unrealizedPnl),
    leverage: `${position.leverage.value}x`,
    liquidationPrice: position.liquidationPx ? formatUSD(position.liquidationPx, 4) : 'N/A'
  };
}

/**
 * Formats balance data for display
 */
export function formatBalance(balance: SpotBalance): {
  coin: string;
  total: string;
  available: string;
  held: string;
} {
  const total = parseFloat(balance.total);
  const hold = parseFloat(balance.hold);
  const available = total - hold;
  
  return {
    coin: balance.coin,
    total: formatWei(balance.total, 6, 4),
    available: formatWei(available.toString(), 6, 4),
    held: formatWei(balance.hold, 6, 4)
  };
}

/**
 * Formats trade data for display
 */
export function formatTrade(trade: TradeData): {
  coin: string;
  side: string;
  price: string;
  size: string;
  time: string;
  value: string;
} {
  const value = parseFloat(trade.px) * parseFloat(trade.sz);
  
  return {
    coin: trade.coin,
    side: trade.side === 'A' ? 'Sell' : 'Buy',
    price: formatUSD(trade.px, 4),
    size: formatWei(trade.sz, 6, 4),
    time: formatTimestamp(trade.time),
    value: formatUSD(value)
  };
}

/**
 * Formats order book data for display
 */
export function formatOrderBook(book: OrderBookData): {
  coin: string;
  bids: { price: string; size: string; total: string }[];
  asks: { price: string; size: string; total: string }[];
  spread: string;
  time: string;
} {
  const [bids, asks] = book.levels;
  
  const formatLevel = (level: { px: string; sz: string; n: number }) => ({
    price: formatUSD(level.px, 4),
    size: formatWei(level.sz, 6, 4),
    total: formatUSD((parseFloat(level.px) * parseFloat(level.sz)).toString())
  });
  
  const bestBid = bids[0] ? parseFloat(bids[0].px) : 0;
  const bestAsk = asks[0] ? parseFloat(asks[0].px) : 0;
  const spread = bestAsk && bestBid ? bestAsk - bestBid : 0;
  
  return {
    coin: book.coin,
    bids: bids.map(formatLevel),
    asks: asks.map(formatLevel),
    spread: formatUSD(spread, 4),
    time: formatTimestamp(book.time)
  };
}

/**
 * Formats transaction data for display
 */
export function formatTransaction(tx: HyperEVMTransaction): {
  hash?: string;
  from: string;
  to: string;
  value: string;
  gas: string;
  gasPrice: string;
  nonce: string;
} {
  return {
    hash: (tx as any).hash || 'Pending',
    from: formatAddress(tx.from),
    to: formatAddress(tx.to || ''),
    value: tx.value ? formatWei(tx.value) + ' HYPE' : '0 HYPE',
    gas: formatGas(tx.gas || '0'),
    gasPrice: tx.gasPrice ? formatWei(tx.gasPrice, 9, 2) + ' Gwei' : 'N/A',
    nonce: (tx.nonce || 0).toString()
  };
}

/**
 * Formats transaction receipt for display
 */
export function formatTransactionReceipt(receipt: TransactionReceipt): {
  hash: string;
  status: string;
  block: string;
  gasUsed: string;
  effectiveGasPrice: string;
  totalCost: string;
  from: string;
  to: string;
} {
  const totalCost = BigInt(receipt.gasUsed) * BigInt(receipt.effectiveGasPrice);
  
  return {
    hash: receipt.transactionHash,
    status: receipt.status === 1 ? 'Success' : 'Failed',
    block: `${receipt.blockNumber} (#${receipt.transactionIndex})`,
    gasUsed: formatGas(receipt.gasUsed),
    effectiveGasPrice: formatWei(receipt.effectiveGasPrice, 9, 2) + ' Gwei',
    totalCost: formatWei(totalCost.toString()) + ' HYPE',
    from: formatAddress(receipt.from),
    to: formatAddress(receipt.to || '')
  };
}

/**
 * Formats block data for display
 */
export function formatBlock(block: Block): {
  number: string;
  hash: string;
  timestamp: string;
  transactions: string;
  gasUsed: string;
  gasLimit: string;
  utilization: string;
  size: string;
} {
  const utilization = block.gasLimit > 0 ? (block.gasUsed / block.gasLimit) * 100 : 0;
  
  return {
    number: `#${block.number}`,
    hash: block.hash,
    timestamp: formatTimestamp(block.timestamp * 1000),
    transactions: block.transactions.length.toString(),
    gasUsed: formatGas(block.gasUsed),
    gasLimit: formatGas(block.gasLimit),
    utilization: `${utilization.toFixed(1)}%`,
    size: `${(block.size / 1024).toFixed(1)} KB`
  };
}

/**
 * Formats error messages with context
 */
export function formatError(error: Error, context?: string): string {
  const prefix = context ? `[${context}] ` : '';
  return `${prefix}${error.name}: ${error.message}`;
}

/**
 * Formats large numbers with abbreviations
 */
export function formatLargeNumber(num: number | string, precision: number = 2): string {
  const value = typeof num === 'string' ? parseFloat(num) : num;
  
  if (isNaN(value)) {
    return '0';
  }
  
  if (value >= 1e12) {
    return `${(value / 1e12).toFixed(precision)}T`;
  } else if (value >= 1e9) {
    return `${(value / 1e9).toFixed(precision)}B`;
  } else if (value >= 1e6) {
    return `${(value / 1e6).toFixed(precision)}M`;
  } else if (value >= 1e3) {
    return `${(value / 1e3).toFixed(precision)}K`;
  } else {
    return value.toFixed(precision);
  }
}

/**
 * Formats JSON data with proper indentation
 */
export function formatJSON(data: any, indent: number = 2): string {
  try {
    return JSON.stringify(data, null, indent);
  } catch {
    return '[Invalid JSON]';
  }
}

/**
 * Truncates text with ellipsis
 */
export function truncateText(text: string, maxLength: number, ellipsis: string = '...'): string {
  if (!text || text.length <= maxLength) {
    return text;
  }
  
  return text.slice(0, maxLength - ellipsis.length) + ellipsis;
}

/**
 * Formats hash values with truncation for display
 */
export function formatHash(hash: string, prefixLength: number = 8, suffixLength: number = 8): string {
  if (!hash || hash.length < prefixLength + suffixLength) {
    return hash;
  }
  
  return `${hash.slice(0, prefixLength)}...${hash.slice(-suffixLength)}`;
}
/**
 * Common types and interfaces shared across the HyperSim SDK
 */

// Network Configuration
export type HyperSimNetwork = 'mainnet' | 'testnet';

export interface NetworkConfig {
  chainId: number;
  rpcUrl: string;
  wsUrl?: string;
  name: string;
}

// SDK Configuration
export interface SDKOptions {
  network?: HyperSimNetwork;
  rpcUrl?: string;
  wsUrl?: string;
  apiKey?: string;
  timeout?: number;
  retries?: number;
  retryDelay?: number;
  enableAI?: boolean;
  crossLayer?: boolean;
  plugins?: Plugin[];
  debug?: boolean;
}

// Simulation Types
export interface SimulateOptions {
  transaction: {
    from: string;
    to?: string;
    value?: string;
    data?: string;
    gas?: string;
    gasPrice?: string;
    nonce?: number;
  };
  hyperCoreData?: boolean;
  aiAnalysis?: boolean;
  dualBlocks?: boolean;
  blockNumber?: number | string;
}

export interface SimulateResult {
  success: boolean;
  gasUsed: number;
  gasPrice: string;
  result?: string;
  error?: string;
  stateChanges?: StateChange[];
  hyperCoreData?: any;
  aiAnalysis?: AIAnalysisResult;
  estimatedCost: string;
  timestamp: number;
}

export interface StateChange {
  address: string;
  key: string;
  before: string;
  after: string;
}

export interface AIAnalysisResult {
  optimization?: string;
  riskAssessment?: {
    level: 'low' | 'medium' | 'high';
    factors: string[];
  };
  gasOptimization?: {
    currentGas: number;
    optimizedGas?: number;
    suggestions: string[];
  };
  recommendations?: string[];
}

// Plugin System Types
export interface Plugin {
  name: string;
  version?: string;
  initialize?(sdk: any): Promise<void> | void;
  beforeRequest?(options: any): Promise<any> | any;
  afterResponse?(response: any): Promise<any> | any;
  onError?(error: any): Promise<void> | void;
}

export interface PluginHook {
  name: string;
  phase: 'before-request' | 'after-response' | 'on-error';
  handler: (context: any, ...args: any[]) => Promise<any> | any;
  priority?: number;
}

// WebSocket Types
export interface WebSocketOptions {
  reconnect?: boolean;
  maxReconnectAttempts?: number;
  reconnectDelay?: number;
  pingInterval?: number;
  connectionTimeout?: number;
}

export interface WebSocketMessage {
  method: string;
  subscription?: SubscriptionType;
  id?: string | number;
}

export type ConnectionState = 'connecting' | 'connected' | 'disconnected' | 'reconnecting';

// Subscription Types
export interface TradeSubscription {
  type: 'trades';
  coin: string;
}

export interface OrderBookSubscription {
  type: 'l2Book';
  coin: string;
  nSigFigs?: number;
  maintainBook?: boolean;
}

export interface CandleSubscription {
  type: 'candle';
  coin: string;
  interval: '1m' | '15m' | '1h' | '4h' | '1d';
}

export interface UserEventsSubscription {
  type: 'userEvents';
  user: string;
}

export interface UserFillsSubscription {
  type: 'userFills';
  user: string;
}

export interface UserPositionsSubscription {
  type: 'userPositions';
  user: string;
}

export type SubscriptionType = 
  | TradeSubscription 
  | OrderBookSubscription 
  | CandleSubscription
  | UserEventsSubscription
  | UserFillsSubscription
  | UserPositionsSubscription;

// WebSocket Data Types
export interface TradeData {
  coin: string;
  side: 'A' | 'B'; // Ask or Bid
  px: string;
  sz: string;
  hash: string;
  time: number;
  tid: number;
}

export interface BookLevel {
  px: string;
  sz: string;
  n: number; // number of orders
}

export interface OrderBookData {
  coin: string;
  levels: [BookLevel[], BookLevel[]]; // [bids, asks]
  time: number;
}

export interface CandleData {
  coin: string;
  interval: string;
  t: number; // timestamp
  T: number; // close time
  s: string; // start price
  c: string; // close price
  h: string; // high price
  l: string; // low price
  v: string; // volume
  n: number; // number of trades
}

export interface UserFillData {
  coin: string;
  px: string;
  sz: string;
  side: 'A' | 'B';
  time: number;
  startPosition: string;
  dir: string;
  closedPnl: string;
  hash: string;
  oid: number;
  crossed: boolean;
  fee: string;
  liquidation?: boolean;
}

// HTTP Client Types
export interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  headers?: Record<string, string>;
  body?: any;
  timeout?: number;
  retries?: number;
}

export interface Response<T = any> {
  data: T;
  status: number;
  headers: Record<string, string>;
  success: boolean;
}

// Error Types
export interface ErrorContext {
  operation: string;
  timestamp: number;
  network?: HyperSimNetwork;
  retryAttempt?: number;
  metadata?: Record<string, any>;
}

// Retry Configuration
export interface RetryConfig {
  maxAttempts: number;
  baseDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
  jitter: boolean;
}

// Rate Limiting
export interface RateLimitConfig {
  requestsPerSecond: number;
  burstSize: number;
  windowMs: number;
}

// Performance Monitoring
export interface PerformanceMetrics {
  requestCount: number;
  errorCount: number;
  averageResponseTime: number;
  p95ResponseTime: number;
  connectionUptime: number;
  lastError?: Date;
}

// Utility Types
export type Awaitable<T> = T | Promise<T>;
export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;
export type RequiredKeys<T, K extends keyof T> = T & Required<Pick<T, K>>;

// Event Types
export interface SDKEvent {
  type: string;
  timestamp: number;
  data?: any;
}

export interface ConnectionEvent extends SDKEvent {
  type: 'connected' | 'disconnected' | 'reconnecting';
  data: {
    url: string;
    attempt?: number;
  };
}

export interface ErrorEvent extends SDKEvent {
  type: 'error';
  data: {
    error: Error;
    context?: ErrorContext;
  };
}

export interface DataEvent extends SDKEvent {
  type: 'data';
  data: {
    channel: string;
    payload: any;
  };
}

// Constants
export const DEFAULT_TIMEOUT = 30000;
export const DEFAULT_RETRIES = 3;
export const DEFAULT_RETRY_DELAY = 1000;
export const MAX_RETRY_DELAY = 30000;

// Type Guards
export function isTradeSubscription(sub: SubscriptionType): sub is TradeSubscription {
  return sub.type === 'trades';
}

export function isOrderBookSubscription(sub: SubscriptionType): sub is OrderBookSubscription {
  return sub.type === 'l2Book';
}

export function isCandleSubscription(sub: SubscriptionType): sub is CandleSubscription {
  return sub.type === 'candle';
}

export function isUserSubscription(sub: SubscriptionType): sub is UserEventsSubscription | UserFillsSubscription | UserPositionsSubscription {
  return sub.type === 'userEvents' || sub.type === 'userFills' || sub.type === 'userPositions';
}
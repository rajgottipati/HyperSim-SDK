/**
 * HyperCore specific type definitions
 */

/**
 * HyperCore asset information
 */
export interface HyperCoreAsset {
  /** Asset symbol */
  coin: string;
  /** Asset index */
  index: number;
  /** Size decimals */
  szDecimals: number;
  /** Maximum leverage */
  maxLeverage: number;
  /** Only reduce orders allowed */
  onlyIsolated: boolean;
}

/**
 * Position information from HyperCore
 */
export interface HyperCorePosition {
  /** Asset coin */
  coin: string;
  /** Position size */
  szi: string;
  /** Entry price */
  entryPx?: string;
  /** Position side */
  side: 'long' | 'short';
  /** Unrealized PnL */
  unrealizedPnl?: string;
  /** Return on equity */
  returnOnEquity?: string;
}

/**
 * Spot balance information
 */
export interface SpotBalance {
  /** Token symbol */
  coin: string;
  /** Available balance */
  hold: string;
  /** Total balance including holds */
  total: string;
}

/**
 * Market data from HyperCore
 */
export interface HyperCoreMarketData {
  /** Asset symbol */
  coin: string;
  /** Mid price */
  mid: string;
  /** Mark price */
  markPx: string;
  /** Oracle price */
  oraclePx: string;
  /** Best bid */
  bid: string;
  /** Best ask */
  ask: string;
  /** Bid size */
  bidSz: string;
  /** Ask size */
  askSz: string;
  /** 24h volume */
  volume24h: string;
  /** Price change 24h */
  change24h: string;
  /** Funding rate */
  funding: string;
  /** Open interest */
  openInterest: string;
}

/**
 * Order book level
 */
export interface BookLevel {
  /** Price level */
  px: string;
  /** Size at level */
  sz: string;
  /** Number of orders */
  n: number;
}

/**
 * Order book data
 */
export interface OrderBook {
  /** Asset symbol */
  coin: string;
  /** Bid levels */
  bids: BookLevel[];
  /** Ask levels */
  asks: BookLevel[];
  /** Timestamp */
  timestamp: number;
}

/**
 * Trade information
 */
export interface Trade {
  /** Asset symbol */
  coin: string;
  /** Trade side ('A' for ask/sell, 'B' for bid/buy) */
  side: 'A' | 'B';
  /** Trade price */
  px: string;
  /** Trade size */
  sz: string;
  /** Trade hash */
  hash: string;
  /** Trade timestamp */
  time: number;
  /** Trade ID */
  tid?: number;
}

/**
 * User fill information
 */
export interface UserFill {
  /** Asset symbol */
  coin: string;
  /** Order ID */
  oid: number;
  /** Fill price */
  px: string;
  /** Fill size */
  sz: string;
  /** Fill side */
  side: 'B' | 'S';
  /** Fill timestamp */
  time: number;
  /** Start position */
  startPosition: string;
  /** Direction ('Open Long', 'Close Long', etc.) */
  dir: string;
  /** Closed PnL */
  closedPnl?: string;
  /** Transaction hash */
  hash: string;
  /** Fee paid */
  fee: string;
}

/**
 * Liquidation event
 */
export interface Liquidation {
  /** Liquidated user */
  user: string;
  /** Liquidator */
  liquidator: string;
  /** Asset symbol */
  coin: string;
  /** Liquidation size */
  sz: string;
  /** Liquidation price */
  px: string;
  /** Timestamp */
  time: number;
}

/**
 * Funding payment
 */
export interface FundingPayment {
  /** Asset symbol */
  coin: string;
  /** Funding rate */
  fundingRate: string;
  /** Position size */
  szi: string;
  /** Payment amount */
  payment: string;
  /** Timestamp */
  time: number;
}

/**
 * Account summary
 */
export interface AccountSummary {
  /** Account equity */
  accountValue: string;
  /** Total notional locked in orders */
  totalNtlPos: string;
  /** Total raw unrealized PnL */
  totalRawUsd: string;
  /** Total margin used */
  totalMarginUsed: string;
}

/**
 * Clearinghouse state
 */
export interface ClearinghouseState {
  /** Asset positions */
  assetPositions: Array<{
    position: HyperCorePosition;
    type: string;
    unrealizedPnl: string;
  }>;
  /** Cross margin summary */
  crossMarginSummary: AccountSummary;
  /** Cross maintenance margin used */
  crossMaintenanceMarginUsed: string;
  /** Time of state */
  time: number;
}

/**
 * Spot clearinghouse state
 */
export interface SpotClearinghouseState {
  /** Spot balances */
  balances: SpotBalance[];
}

/**
 * L1 order
 */
export interface L1Order {
  /** Asset symbol */
  coin: string;
  /** Order side */
  side: 'B' | 'S';
  /** Order size */
  sz: string;
  /** Limit price */
  limitPx: string;
  /** Order type */
  orderType: {
    limit?: { tif: 'Alo' | 'Ioc' | 'Gtc' };
    trigger?: {
      isMarket: boolean;
      triggerPx: string;
      tpsl: 'tp' | 'sl';
    };
  };
  /** Reduce only */
  reduceOnly: boolean;
  /** Client order ID */
  cloid?: string;
}

/**
 * Meta information about the exchange
 */
export interface ExchangeMeta {
  /** Available assets */
  universe: HyperCoreAsset[];
  /** Spot tokens */
  spotTokens?: Array<{
    name: string;
    szDecimals: number;
    weiDecimals: number;
    index: number;
  }>;
}

/**
 * Candlestick data
 */
export interface Candle {
  /** Open time */
  t: number;
  /** Close time */
  T: number;
  /** Symbol */
  s: string;
  /** Interval */
  i: string;
  /** Open price */
  o: number;
  /** Close price */
  c: number;
  /** High price */
  h: number;
  /** Low price */
  l: number;
  /** Volume */
  v: number;
  /** Number of trades */
  n: number;
}

/**
 * WebSocket subscription data types
 */
export interface WsTrade extends Trade {
  /** Buyer and seller addresses */
  users?: [string, string];
}

export interface WsBook {
  /** Asset symbol */
  coin: string;
  /** Bid and ask levels */
  levels: [BookLevel[], BookLevel[]];
  /** Timestamp */
  time: number;
}

export interface WsBbo {
  /** Asset symbol */
  coin: string;
  /** Best bid and ask */
  bbo: [BookLevel | null, BookLevel | null];
  /** Timestamp */
  time: number;
}

export interface WsUserFill extends UserFill {}

export interface WsLiquidation extends Liquidation {}

export interface WsUserFunding {
  /** Funding payments */
  fundingPayments: FundingPayment[];
}

export interface WsNonUserCancel {
  /** Order ID */
  oid: number;
  /** Asset symbol */
  coin: string;
}

/**
 * Union type for all user events
 */
export type WsUserEvent = 
  | { fills: WsUserFill[] }
  | { funding: WsUserFunding }
  | { liquidation: WsLiquidation }
  | { nonUserCancel: WsNonUserCancel[] };

/**
 * TWAP slice fill
 */
export interface WsTwapSliceFill {
  fill: WsUserFill;
  twapId: number;
}

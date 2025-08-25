// Try to import js-sha3, fall back to a simple hash if not available
let keccak256: (input: string) => string;

try {
  const sha3 = require('js-sha3');
  keccak256 = sha3.keccak256;
} catch {
  // Fallback implementation for development - NOT for production!
  console.warn('js-sha3 not available. Using simplified hash for development only.');
  keccak256 = (input: string) => {
    // This is a simplified hash - NOT secure for production use
    let hash = 0;
    for (let i = 0; i < input.length; i++) {
      const char = input.charCodeAt(i);
      hash = ((hash << 5) - hash + char) & 0xffffffff; // Keep as 32-bit integer
    }
    return Math.abs(hash).toString(16).padStart(8, '0'); // Return 8 chars for function selector
  };
}

/**
 * ABI parameter types and their encoding rules
 */
type ABIType = 
  | 'address'
  | 'uint256'
  | 'uint128'
  | 'uint64'
  | 'uint32'
  | 'uint8'
  | 'int256'
  | 'bool'
  | 'bytes'
  | 'bytes32'
  | 'string';

interface FunctionParameter {
  type: ABIType;
  value: any;
}

/**
 * Function definition for precompile calls
 */
interface FunctionDefinition {
  signature: string;
  types: ABIType[];
  returns: ABIType[];
}

/**
 * ABI Encoder class for encoding function calls
 */
export class ABIEncoder {
  /**
   * Encodes a function call for EVM contract interaction
   */
  static encodeFunctionCall(
    functionSignature: string,
    paramTypes: ABIType[],
    parameters: any[] = []
  ): string {
    // Generate function selector (first 4 bytes of keccak256 hash)
    const functionSelector = this.getFunctionSelector(functionSignature);
    
    // Create parameter objects with bounds checking
    const params: FunctionParameter[] = parameters.map((value, index) => {
      const type = paramTypes[index];
      if (!type) {
        throw new Error(`Missing parameter type at index ${index}`);
      }
      return { type, value };
    });
    
    // Encode parameters
    const encodedParams = this.encodeParameters(params);
    
    // Combine selector and parameters
    return '0x' + functionSelector + encodedParams;
  }

  /**
   * Generates the 4-byte function selector from a function signature
   */
  private static getFunctionSelector(signature: string): string {
    const hash = keccak256(signature);
    return hash.slice(0, 8); // First 4 bytes = 8 hex characters
  }

  /**
   * Encodes function parameters according to ABI specification
   */
  private static encodeParameters(parameters: FunctionParameter[]): string {
    if (parameters.length === 0) {
      return '';
    }

    let encoded = '';
    let dynamicData = '';
    let dynamicOffset = parameters.length * 32; // Each static param takes 32 bytes

    for (const param of parameters) {
      if (this.isDynamicType(param.type)) {
        // For dynamic types, encode offset in static part
        encoded += this.encodeUint256(dynamicOffset);
        const dynamicEncoded = this.encodeDynamicParameter(param);
        dynamicData += dynamicEncoded;
        dynamicOffset += dynamicEncoded.length / 2; // Convert hex chars to bytes
      } else {
        // For static types, encode directly
        encoded += this.encodeStaticParameter(param);
      }
    }

    return encoded + dynamicData;
  }

  /**
   * Checks if a type is dynamic (variable length)
   */
  private static isDynamicType(type: ABIType): boolean {
    return type === 'string' || type === 'bytes' || type.includes('[]');
  }

  /**
   * Encodes a static parameter (fixed length)
   */
  private static encodeStaticParameter(param: FunctionParameter): string {
    switch (param.type) {
      case 'address':
        return this.encodeAddress(param.value);
      case 'uint256':
      case 'uint128':
      case 'uint64':
      case 'uint32':
      case 'uint8':
        return this.encodeUint256(param.value);
      case 'int256':
        return this.encodeInt256(param.value);
      case 'bool':
        return this.encodeBool(param.value);
      case 'bytes32':
        return this.encodeBytes32(param.value);
      default:
        throw new Error(`Unsupported static type: ${param.type}`);
    }
  }

  /**
   * Encodes a dynamic parameter (variable length)
   */
  private static encodeDynamicParameter(param: FunctionParameter): string {
    switch (param.type) {
      case 'string':
        return this.encodeString(param.value);
      case 'bytes':
        return this.encodeBytes(param.value);
      default:
        throw new Error(`Unsupported dynamic type: ${param.type}`);
    }
  }

  /**
   * Encodes an Ethereum address
   */
  private static encodeAddress(address: string): string {
    // Remove 0x prefix if present and pad to 64 characters (32 bytes)
    const cleaned = address.replace('0x', '').toLowerCase();
    if (cleaned.length !== 40) {
      throw new Error(`Invalid address length: ${address}`);
    }
    return cleaned.padStart(64, '0');
  }

  /**
   * Encodes a uint256 value
   */
  private static encodeUint256(value: number | string | bigint): string {
    let bigIntValue: bigint;
    
    if (typeof value === 'string') {
      bigIntValue = BigInt(value);
    } else if (typeof value === 'number') {
      bigIntValue = BigInt(value);
    } else {
      bigIntValue = value;
    }
    
    if (bigIntValue < BigInt(0)) {
      throw new Error('Cannot encode negative value as uint256');
    }
    
    return bigIntValue.toString(16).padStart(64, '0');
  }

  /**
   * Encodes an int256 value (signed)
   */
  private static encodeInt256(value: number | string | bigint): string {
    let bigIntValue: bigint;
    
    if (typeof value === 'string') {
      bigIntValue = BigInt(value);
    } else if (typeof value === 'number') {
      bigIntValue = BigInt(value);
    } else {
      bigIntValue = value;
    }
    
    // Handle two's complement for negative numbers
    if (bigIntValue < BigInt(0)) {
      const maxUint256 = BigInt('0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff');
      bigIntValue = maxUint256 + bigIntValue + BigInt(1);
    }
    
    return bigIntValue.toString(16).padStart(64, '0');
  }

  /**
   * Encodes a boolean value
   */
  private static encodeBool(value: boolean): string {
    return value ? '1'.padStart(64, '0') : '0'.padStart(64, '0');
  }

  /**
   * Encodes a bytes32 value
   */
  private static encodeBytes32(value: string): string {
    const cleaned = value.replace('0x', '');
    if (cleaned.length > 64) {
      throw new Error(`bytes32 value too long: ${value}`);
    }
    return cleaned.padEnd(64, '0');
  }

  /**
   * Encodes a string value (dynamic)
   */
  private static encodeString(value: string): string {
    const bytes = new TextEncoder().encode(value);
    const length = this.encodeUint256(bytes.length);
    
    // Convert bytes to hex and pad to 32-byte boundary
    let hexBytes = Array.from(bytes)
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
    
    // Pad to 32-byte boundary
    const paddingLength = (32 - (bytes.length % 32)) % 32;
    hexBytes += '0'.repeat(paddingLength * 2);
    
    return length + hexBytes;
  }

  /**
   * Encodes a bytes value (dynamic)
   */
  private static encodeBytes(value: string | Uint8Array): string {
    let bytes: Uint8Array;
    
    if (typeof value === 'string') {
      // Assume hex string
      const hex = value.replace('0x', '');
      bytes = new Uint8Array(hex.match(/.{2}/g)!.map(byte => parseInt(byte, 16)));
    } else {
      bytes = value;
    }
    
    const length = this.encodeUint256(bytes.length);
    
    // Convert bytes to hex and pad to 32-byte boundary
    let hexBytes = Array.from(bytes)
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
    
    // Pad to 32-byte boundary
    const paddingLength = (32 - (bytes.length % 32)) % 32;
    hexBytes += '0'.repeat(paddingLength * 2);
    
    return length + hexBytes;
  }
}

/**
 * ABI Decoder class for decoding contract responses
 */
export class ABIDecoder {
  /**
   * Decodes multiple values from a hex response
   */
  static decodeMultiple(hexData: string, returnTypes: ABIType[]): any[] {
    const data = hexData.replace('0x', '');
    const results: any[] = [];
    
    let offset = 0;
    for (const returnType of returnTypes) {
      const result = this.decodeSingle(data.slice(offset), returnType);
      results.push(result);
      offset += 64; // Each return value takes 64 hex chars (32 bytes)
    }
    
    return results;
  }

  /**
   * Decodes a single value from hex data
   */
  static decodeSingle(hexData: string, returnType: ABIType): any {
    const data = hexData.slice(0, 64); // Take first 32 bytes
    
    switch (returnType) {
      case 'address':
        return '0x' + data.slice(24, 64);
      case 'uint256':
      case 'uint128':
      case 'uint64':
      case 'uint32':
      case 'uint8':
        return BigInt('0x' + data);
      case 'bool':
        return BigInt('0x' + data) !== BigInt(0);
      case 'bytes32':
        return '0x' + data;
      case 'string':
        // For strings, we need to handle dynamic data
        const length = parseInt(data, 16);
        const stringData = hexData.slice(64, 64 + (length * 2));
        return new TextDecoder().decode(
          new Uint8Array(stringData.match(/.{2}/g)!.map(byte => parseInt(byte, 16)))
        );
      default:
        throw new Error(`Unsupported return type: ${returnType}`);
    }
  }
}

/**
 * Precompile function definitions for HyperCore
 */
export const PRECOMPILE_FUNCTIONS = {
  getPosition: {
    signature: 'getPosition(address,uint32)',
    types: ['address', 'uint32'] as ABIType[],
    returns: ['uint256', 'uint256', 'uint256', 'uint256', 'int256'] as ABIType[] // szi, entryPx, leverage, liquidationPx, unrealizedPnl
  },
  getSpotBalance: {
    signature: 'getSpotBalance(address,uint32)',
    types: ['address', 'uint32'] as ABIType[],
    returns: ['uint256', 'uint256'] as ABIType[] // total, hold
  },
  getVaultEquity: {
    signature: 'getVaultEquity(address)',
    types: ['address'] as ABIType[],
    returns: ['uint256'] as ABIType[] // equity
  },
  getWithdrawable: {
    signature: 'getWithdrawable(address,uint32)',
    types: ['address', 'uint32'] as ABIType[],
    returns: ['uint256'] as ABIType[] // withdrawable
  },
  getMarkPx: {
    signature: 'getMarkPx(uint32)',
    types: ['uint32'] as ABIType[],
    returns: ['uint256'] as ABIType[] // price
  },
  getOraclePx: {
    signature: 'getOraclePx(uint32)',
    types: ['uint32'] as ABIType[],
    returns: ['uint256'] as ABIType[] // price
  },
  getSpotPx: {
    signature: 'getSpotPx(uint32)',
    types: ['uint32'] as ABIType[],
    returns: ['uint256'] as ABIType[] // price
  },
  getL1BlockNumber: {
    signature: 'getL1BlockNumber()',
    types: [] as ABIType[],
    returns: ['uint256'] as ABIType[] // blockNumber
  },
  getPerpAssetInfo: {
    signature: 'getPerpAssetInfo(uint32)',
    types: ['uint32'] as ABIType[],
    returns: ['string', 'uint8', 'uint32', 'uint256'] as ABIType[] // coin, szDecimals, maxLeverage, minSize
  },
  getSpotAssetInfo: {
    signature: 'getSpotAssetInfo(uint32)',
    types: ['uint32'] as ABIType[],
    returns: ['string', 'uint8', 'uint8', 'uint32'] as ABIType[] // coin, szDecimals, weiDecimals, index
  },
  getTokenInfo: {
    signature: 'getTokenInfo(uint32)',
    types: ['uint32'] as ABIType[],
    returns: ['string', 'uint8', 'uint8'] as ABIType[] // name, szDecimals, weiDecimals
  }
} as const satisfies Record<string, FunctionDefinition>;

/**
 * Format decimals for display
 */
export function formatDecimals(value: bigint | string | number, decimals: number = 6): string {
  let bigIntValue: bigint;
  
  if (typeof value === 'string') {
    bigIntValue = BigInt(value);
  } else if (typeof value === 'number') {
    bigIntValue = BigInt(value);
  } else {
    bigIntValue = value;
  }
  
  const divisor = BigInt(10 ** decimals);
  const wholePart = bigIntValue / divisor;
  const fractionalPart = bigIntValue % divisor;
  
  if (fractionalPart === BigInt(0)) {
    return wholePart.toString();
  }
  
  const fractionalStr = fractionalPart.toString().padStart(decimals, '0');
  const trimmedFractional = fractionalStr.replace(/0+$/, '');
  
  return `${wholePart}.${trimmedFractional}`;
}

/**
 * Legacy exports for backward compatibility
 */
export function encodeFunctionCall(
  functionSignature: string,
  parameters: FunctionParameter[] = []
): string {
  const types = parameters.map(p => p.type);
  const values = parameters.map(p => p.value);
  return ABIEncoder.encodeFunctionCall(functionSignature, types, values);
}

export function decodeResponse(hexData: string, returnType: ABIType): any {
  return ABIDecoder.decodeSingle(hexData.replace('0x', ''), returnType);
}

export function createParameter(type: ABIType, value: any): FunctionParameter {
  return { type, value };
}

/**
 * Legacy function signatures (kept for compatibility with old code)
 */
export const HYPERCORE_FUNCTIONS = {
  // User info functions
  getUserState: 'getUserState(address)',
  getUserFunding: 'getUserFunding(address)', 
  getUserFills: 'getUserFills(address)',
  getUserFillsByTime: 'getUserFillsByTime(address,uint256,uint256)',
  
  // Market data functions
  getAllMids: 'getAllMids()',
  getL2Book: 'getL2Book(uint32)',
  getCandleSnapshot: 'getCandleSnapshot(uint32,string,uint256,uint256)',
  
  // Meta functions
  getMetaAndAssetCtxs: 'getMetaAndAssetCtxs()',
  getSpotMetaAndAssetCtxs: 'getSpotMetaAndAssetCtxs()',
  
  // WebData functions  
  getWebData2: 'getWebData2(address,uint256)',
  
  // Clearinghouse state
  getClearinghouseState: 'getClearinghouseState(address)',
  
  // Spot functions
  getSpotClearinghouseState: 'getSpotClearinghouseState(address)',
  getSpotMeta: 'getSpotMeta()'
} as const;

/**
 * Precompile contract addresses on HyperEVM (legacy export)
 */
export const PRECOMPILE_ADDRESSES = {
  INFO: '0x800',           // User info and state
  EXCHANGE: '0x801',       // Exchange and market data  
  SPOT: '0x802',          // Spot trading
  PERPETUALS: '0x803',    // Perpetuals trading
  VAULT: '0x804',         // Vault operations
  WEB_DATA: '0x805',      // Web data aggregation
  META: '0x806',          // Metadata
  ORACLE: '0x807',        // Price oracle
  BRIDGE: '0x808',        // Cross-chain bridge
  GOVERNANCE: '0x809',    // Governance
  REWARDS: '0x80A',       // Rewards system
  ANALYTICS: '0x80B',     // Analytics
  UTILITIES: '0x80C'      // Utility functions
} as const;
/**
 * HyperSim SDK - TypeScript SDK for HyperEVM Transaction Simulation
 * 
 * The first SDK that makes HyperEVM transaction simulation developer-friendly
 * with AI-powered analysis and cross-layer HyperCore integration.
 * 
 * Features:
 * - Transaction simulation with failure prediction
 * - Cross-layer HyperCore integration
 * - AI-powered transaction analysis and optimization
 * - WebSocket streaming for real-time data
 * - Plugin system for extensibility
 * - Dual-block system support
 * - Production-ready error handling
 * 
 * @author MiniMax Agent
 * @version 1.0.0
 */

// Core SDK
export { HyperSimSDK } from './core/HyperSimSDK';
export type { HyperSimConfig } from './core/HyperSimSDK';

// Client implementations
export { HyperEVMClient } from './clients/HyperEVMClient';
export { HyperCoreClient } from './clients/HyperCoreClient';
export { WebSocketClient, ConnectionState } from './clients/WebSocketClient';
export type { 
  WebSocketClientConfig, 
  WSSubscription, 
  WSMessage,
  SubscriptionType 
} from './clients/WebSocketClient';

// AI Analysis
export { AIAnalyzer } from './ai/AIAnalyzer';

// Plugin System
export * from './plugins';

// Security Components
export * from './security';

// Types and Interfaces
export * from './types';
export * from './types/simulation';
export * from './types/network';
export * from './types/ai';
export * from './types/errors';
export * from './types/common';
export * from './types/hyperevm';
export * from './types/hypercore';

// Utilities
export * from './utils/validators';
export * from './utils/formatters';
export * from './utils/constants';

// Version info
export const SDK_VERSION = '1.0.0';
export const SDK_NAME = '@hypersim/sdk';

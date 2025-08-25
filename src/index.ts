/**
 * HyperSim SDK - Advanced TypeScript SDK for HyperEVM blockchain
 * 
 * Main entry point for the HyperSim SDK providing comprehensive access to:
 * - Transaction simulation with AI-powered analysis
 * - Cross-layer integration with HyperCore
 * - Real-time WebSocket streaming
 * - Advanced plugin architecture
 * - Middleware system for extensibility
 */

// Core SDK
export { HyperSimSDK } from './core/HyperSimSDK.js';

// Clients
export { HyperEVMClient } from './clients/hyperEVM.js';
export { HyperCoreClient } from './clients/hyperCore.js';
export { WebSocketClient, createWebSocketClient, PooledWebSocketClient } from './clients/websocket.js';

// AI Components
export { AIAnalyzer } from './ai/analyzer.js';
export { TransactionOptimizer } from './ai/optimizer.js';

// Core Components
export { TransactionSimulator } from './core/simulation.js';

// Plugin System
export { PluginManager } from './plugins/system.js';
export { 
  MiddlewareManager, 
  MiddlewarePipeline, 
  BuiltInMiddleware 
} from './plugins/middleware.js';

// Error Classes
export {
  HyperSimError,
  NetworkError,
  APIError,
  ValidationError,
  SimulationError,
  WebSocketError,
  PluginError,
  AIError,
  RateLimitError,
  TimeoutError,
  CrossLayerError,
  ConfigurationError,
  ErrorFactory,
  ErrorUtils
} from './core/errors.js';

// Type Definitions
export * from './types/common.js';
export * from './types/hyperevm.js';
export * from './types/hypercore.js';

// Utilities
export * from './utils/validators.js';
export * from './utils/formatters.js';
export * from './utils/constants.js';

// Version
export const VERSION = '1.0.0';

/**
 * Create a new HyperSim SDK instance with default configuration
 */
export function createHyperSimSDK(options?: import('./types/common.js').SDKOptions) {
  return new HyperSimSDK(options);
}

/**
 * Default export - HyperSim SDK class
 */
export default HyperSimSDK;
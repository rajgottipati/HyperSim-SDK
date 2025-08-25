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
 * - Dual-block system support
 * - Production-ready error handling
 * 
 * @author MiniMax Agent
 * @version 1.0.0
 */

export { HyperSimSDK } from './core/HyperSimSDK';
export { HyperEVMClient } from './clients/HyperEVMClient';
export { HyperCoreClient } from './clients/HyperCoreClient';
export { AIAnalyzer } from './ai/AIAnalyzer';

// Types and Interfaces
export * from './types';
export * from './types/simulation';
export * from './types/network';
export * from './types/ai';
export * from './types/errors';

// Utilities
export * from './utils/validators';
export * from './utils/formatters';
export * from './utils/constants';

// Version info
export const SDK_VERSION = '1.0.0';
export const SDK_NAME = '@hypersim/sdk';

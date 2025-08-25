/**
 * Logging plugin for comprehensive request/response logging
 */

import { Plugin, PluginSystem, HookContext } from './PluginSystem';

/**
 * Logging configuration
 */
export interface LoggingConfig {
  /** Log level */
  level: 'debug' | 'info' | 'warn' | 'error';
  /** Include request/response data */
  includeData: boolean;
  /** Include headers */
  includeHeaders: boolean;
  /** Maximum data length to log */
  maxDataLength: number;
  /** Custom log format */
  format?: 'json' | 'text';
  /** Custom logger function */
  customLogger?: (level: string, message: string, data?: any) => void;
}

/**
 * Default logging configuration
 */
const DEFAULT_CONFIG: LoggingConfig = {
  level: 'info',
  includeData: false,
  includeHeaders: false,
  maxDataLength: 1000,
  format: 'text'
};

/**
 * Logging plugin implementation
 */
export class LoggingPlugin implements Plugin {
  public readonly name = 'logging';
  public readonly version = '1.0.0';
  public readonly description = 'Comprehensive request/response logging';

  private config: LoggingConfig;
  private startTimes = new Map<string, number>();

  constructor(config: Partial<LoggingConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  async initialize(system: PluginSystem): Promise<void> {
    this.log('info', 'Logging plugin initialized');
  }

  async cleanup(): Promise<void> {
    this.log('info', 'Logging plugin cleaned up');
    this.startTimes.clear();
  }

  public readonly hooks = {
    'before-request': async (context: HookContext, request: any): Promise<void> => {
      this.startTimes.set(context.requestId, Date.now());
      
      if (this.shouldLog('debug')) {
        this.log('debug', `Request starting: ${request.method} ${request.url}`, {
          requestId: context.requestId,
          method: request.method,
          url: request.url,
          headers: this.config.includeHeaders ? request.headers : undefined,
          data: this.config.includeData ? this.truncateData(request.data) : undefined
        });
      }
    },

    'after-response': async (context: HookContext, response: any): Promise<void> => {
      const startTime = this.startTimes.get(context.requestId);
      const duration = startTime ? Date.now() - startTime : 0;
      this.startTimes.delete(context.requestId);

      const level = response.status >= 400 ? 'error' : 'info';
      
      if (this.shouldLog(level)) {
        this.log(level, `Request completed: ${response.status}`, {
          requestId: context.requestId,
          status: response.status,
          duration: `${duration}ms`,
          headers: this.config.includeHeaders ? response.headers : undefined,
          data: this.config.includeData ? this.truncateData(response.data) : undefined
        });
      }
    },

    'before-simulation': async (context: HookContext, transaction: any): Promise<void> => {
      if (this.shouldLog('debug')) {
        this.log('debug', 'Transaction simulation starting', {
          requestId: context.requestId,
          from: transaction.from,
          to: transaction.to,
          value: transaction.value,
          gasLimit: transaction.gasLimit
        });
      }
    },

    'after-simulation': async (context: HookContext, result: any): Promise<void> => {
      const level = result.success ? 'info' : 'warn';
      
      if (this.shouldLog(level)) {
        this.log(level, `Simulation ${result.success ? 'completed' : 'failed'}`, {
          requestId: context.requestId,
          success: result.success,
          gasUsed: result.gasUsed,
          blockType: result.blockType,
          error: result.error
        });
      }
    },

    'before-ai-analysis': async (context: HookContext): Promise<void> => {
      if (this.shouldLog('debug')) {
        this.log('debug', 'AI analysis starting', {
          requestId: context.requestId
        });
      }
    },

    'after-ai-analysis': async (context: HookContext, insights: any): Promise<void> => {
      if (this.shouldLog('info')) {
        this.log('info', 'AI analysis completed', {
          requestId: context.requestId,
          riskLevel: insights.riskLevel,
          confidence: insights.confidence,
          recommendationsCount: insights.recommendations?.length || 0
        });
      }
    },

    'on-error': async (context: HookContext, error: any): Promise<void> => {
      this.log('error', `Error occurred: ${error.message}`, {
        requestId: context.requestId,
        errorCode: error.code,
        errorName: error.name,
        stack: this.config.level === 'debug' ? error.stack : undefined
      });
    },

    'on-connect': async (context: HookContext, connectionInfo: any): Promise<void> => {
      this.log('info', 'Connection established', {
        requestId: context.requestId,
        endpoint: connectionInfo.endpoint,
        protocol: connectionInfo.protocol
      });
    },

    'on-disconnect': async (context: HookContext, disconnectInfo: any): Promise<void> => {
      this.log('info', 'Connection closed', {
        requestId: context.requestId,
        code: disconnectInfo.code,
        reason: disconnectInfo.reason
      });
    }
  };

  /**
   * Check if message should be logged based on level
   */
  private shouldLog(messageLevel: string): boolean {
    const levels = ['debug', 'info', 'warn', 'error'];
    const configLevelIndex = levels.indexOf(this.config.level);
    const messageLevelIndex = levels.indexOf(messageLevel);
    return messageLevelIndex >= configLevelIndex;
  }

  /**
   * Log message with appropriate format
   */
  private log(level: string, message: string, data?: any): void {
    if (this.config.customLogger) {
      this.config.customLogger(level, message, data);
      return;
    }

    const timestamp = new Date().toISOString();
    
    if (this.config.format === 'json') {
      const logEntry = {
        timestamp,
        level: level.toUpperCase(),
        message,
        ...data
      };
      console.log(JSON.stringify(logEntry));
    } else {
      const prefix = `[${timestamp}] [${level.toUpperCase()}] [HyperSim SDK]`;
      if (data) {
        console.log(`${prefix} ${message}`, data);
      } else {
        console.log(`${prefix} ${message}`);
      }
    }
  }

  /**
   * Truncate data to max length
   */
  private truncateData(data: any): any {
    if (!data) return data;
    
    const str = typeof data === 'string' ? data : JSON.stringify(data);
    if (str.length <= this.config.maxDataLength) {
      return data;
    }
    
    return str.substring(0, this.config.maxDataLength) + '...';
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<LoggingConfig>): void {
    this.config = { ...this.config, ...newConfig };
    this.log('info', 'Logging configuration updated', { config: this.config });
  }

  /**
   * Get current configuration
   */
  getConfig(): LoggingConfig {
    return { ...this.config };
  }
}
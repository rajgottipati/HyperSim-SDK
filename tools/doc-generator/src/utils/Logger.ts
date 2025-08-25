import chalk from 'chalk';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

/**
 * Logger utility for the documentation generator
 */
export class Logger {
  private verbose: boolean = false;
  private logLevel: LogLevel = 'info';

  constructor(options: { verbose?: boolean; logLevel?: LogLevel } = {}) {
    this.verbose = options.verbose ?? false;
    this.logLevel = options.logLevel ?? 'info';
  }

  /**
   * Set verbose mode
   */
  setVerbose(verbose: boolean): void {
    this.verbose = verbose;
  }

  /**
   * Set log level
   */
  setLogLevel(level: LogLevel): void {
    this.logLevel = level;
  }

  /**
   * Debug level logging
   */
  debug(message: string, ...args: any[]): void {
    if (this.shouldLog('debug')) {
      const timestamp = this.getTimestamp();
      console.log(chalk.gray(`[${timestamp}] [DEBUG]`), message, ...args);
    }
  }

  /**
   * Info level logging
   */
  info(message: string, ...args: any[]): void {
    if (this.shouldLog('info')) {
      const timestamp = this.getTimestamp();
      console.log(chalk.blue(`[${timestamp}] [INFO]`), message, ...args);
    }
  }

  /**
   * Warning level logging
   */
  warn(message: string, ...args: any[]): void {
    if (this.shouldLog('warn')) {
      const timestamp = this.getTimestamp();
      console.warn(chalk.yellow(`[${timestamp}] [WARN]`), message, ...args);
    }
  }

  /**
   * Error level logging
   */
  error(message: string, ...args: any[]): void {
    if (this.shouldLog('error')) {
      const timestamp = this.getTimestamp();
      console.error(chalk.red(`[${timestamp}] [ERROR]`), message, ...args);
    }
  }

  /**
   * Success logging (always shown)
   */
  success(message: string, ...args: any[]): void {
    const timestamp = this.getTimestamp();
    console.log(chalk.green(`[${timestamp}] [SUCCESS]`), message, ...args);
  }

  /**
   * Log with custom formatting
   */
  log(level: LogLevel, message: string, color?: string, ...args: any[]): void {
    if (this.shouldLog(level)) {
      const timestamp = this.getTimestamp();
      const levelStr = `[${level.toUpperCase()}]`;
      const coloredLevel = color ? chalk.hex(color)(levelStr) : levelStr;
      console.log(chalk.gray(`[${timestamp}]`), coloredLevel, message, ...args);
    }
  }

  /**
   * Log performance metrics
   */
  perf(operation: string, startTime: number, ...args: any[]): void {
    const duration = Date.now() - startTime;
    const durationStr = this.formatDuration(duration);
    
    if (this.verbose) {
      console.log(
        chalk.magenta(`[${this.getTimestamp()}] [PERF]`),
        `${operation} completed in ${chalk.cyan(durationStr)}`,
        ...args
      );
    }
  }

  /**
   * Log progress with percentage
   */
  progress(message: string, current: number, total: number): void {
    if (this.verbose) {
      const percentage = Math.round((current / total) * 100);
      const progressBar = this.generateProgressBar(percentage);
      const timestamp = this.getTimestamp();
      
      console.log(
        chalk.blue(`[${timestamp}] [PROGRESS]`),
        `${message} ${progressBar} ${percentage}% (${current}/${total})`
      );
    }
  }

  /**
   * Start a named timer
   */
  private timers: Map<string, number> = new Map();
  
  startTimer(name: string): void {
    this.timers.set(name, Date.now());
    if (this.verbose) {
      this.debug(`Timer started: ${name}`);
    }
  }

  /**
   * End a named timer and log the duration
   */
  endTimer(name: string, message?: string): number {
    const startTime = this.timers.get(name);
    if (!startTime) {
      this.warn(`Timer '${name}' was not started`);
      return 0;
    }
    
    const duration = Date.now() - startTime;
    this.timers.delete(name);
    
    const durationStr = this.formatDuration(duration);
    const logMessage = message || `Timer '${name}' completed`;
    
    if (this.verbose) {
      console.log(
        chalk.magenta(`[${this.getTimestamp()}] [TIMER]`),
        `${logMessage} in ${chalk.cyan(durationStr)}`
      );
    }
    
    return duration;
  }

  /**
   * Log a group of related messages
   */
  group(title: string, messages: Array<{level: LogLevel, message: string}>): void {
    const timestamp = this.getTimestamp();
    console.log(chalk.bold.blue(`[${timestamp}] [GROUP] ${title}`));
    
    for (const msg of messages) {
      const indent = '  ';
      const levelColors: Record<LogLevel, any> = {
        debug: chalk.gray,
        info: chalk.blue,
        warn: chalk.yellow,
        error: chalk.red
      };
      
      const coloredLevel = levelColors[msg.level](`[${msg.level.toUpperCase()}]`);
      console.log(indent + coloredLevel, msg.message);
    }
  }

  /**
   * Log structured data as a table
   */
  table(title: string, data: Record<string, any>[]): void {
    if (this.verbose) {
      const timestamp = this.getTimestamp();
      console.log(chalk.blue(`[${timestamp}] [TABLE] ${title}`));
      console.table(data);
    }
  }

  /**
   * Create a child logger with a prefix
   */
  child(prefix: string): Logger {
    const childLogger = new Logger({ verbose: this.verbose, logLevel: this.logLevel });
    
    // Override logging methods to include prefix
    const originalMethods = ['debug', 'info', 'warn', 'error'] as const;
    
    for (const method of originalMethods) {
      const originalMethod = childLogger[method].bind(childLogger);
      childLogger[method] = (message: string, ...args: any[]) => {
        originalMethod(`[${prefix}] ${message}`, ...args);
      };
    }
    
    return childLogger;
  }

  private shouldLog(level: LogLevel): boolean {
    const levels: Record<LogLevel, number> = {
      debug: 0,
      info: 1,
      warn: 2,
      error: 3
    };
    
    const currentLevelValue = levels[this.logLevel];
    const messageLevelValue = levels[level];
    
    return messageLevelValue >= currentLevelValue || (level === 'debug' && this.verbose);
  }

  private getTimestamp(): string {
    return new Date().toISOString().replace('T', ' ').substring(0, 19);
  }

  private formatDuration(ms: number): string {
    if (ms < 1000) {
      return `${ms}ms`;
    } else if (ms < 60000) {
      return `${(ms / 1000).toFixed(1)}s`;
    } else {
      const minutes = Math.floor(ms / 60000);
      const seconds = ((ms % 60000) / 1000).toFixed(1);
      return `${minutes}m ${seconds}s`;
    }
  }

  private generateProgressBar(percentage: number, width: number = 20): string {
    const filled = Math.round((percentage / 100) * width);
    const empty = width - filled;
    return `[${chalk.green('='.repeat(filled))}${' '.repeat(empty)}]`;
  }
}
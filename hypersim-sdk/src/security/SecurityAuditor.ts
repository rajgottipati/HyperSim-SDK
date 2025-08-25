/**
 * Security audit logging and monitoring
 */

import { EventEmitter } from 'events';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import { SecurityEvent, SecurityEventType } from './types';

interface AuditConfig {
  logDirectory?: string;
  maxLogSize?: number;
  rotateDaily?: boolean;
  enableRemoteLogging?: boolean;
  remoteEndpoint?: string;
  bufferSize?: number;
  flushInterval?: number;
}

export class SecurityAuditor extends EventEmitter {
  private readonly config: Required<AuditConfig>;
  private readonly eventBuffer: SecurityEvent[] = [];
  private flushTimer: NodeJS.Timeout;
  private currentLogFile?: string;
  private logRotationTimer: NodeJS.Timeout;

  constructor(enabled: boolean, config: AuditConfig = {}) {
    super();
    
    this.config = {
      logDirectory: config.logDirectory ?? path.join(os.tmpdir(), '.hypersim-audit'),
      maxLogSize: config.maxLogSize ?? 10 * 1024 * 1024, // 10MB
      rotateDaily: config.rotateDaily ?? true,
      enableRemoteLogging: config.enableRemoteLogging ?? false,
      remoteEndpoint: config.remoteEndpoint ?? '',
      bufferSize: config.bufferSize ?? 100,
      flushInterval: config.flushInterval ?? 30000 // 30 seconds
    };

    if (enabled) {
      this.initialize();
    }
  }

  /**
   * Log security event
   */
  async log(event: SecurityEvent): Promise<void> {
    // Add to buffer
    this.eventBuffer.push({
      ...event,
      timestamp: event.timestamp || Date.now()
    });

    // Emit event for real-time monitoring
    this.emit('securityEvent', event);

    // Flush if buffer is full or event is critical
    if (this.eventBuffer.length >= this.config.bufferSize || event.severity === 'critical') {
      await this.flush();
    }
  }

  /**
   * Log authentication event
   */
  async logAuth(success: boolean, userId?: string, ip?: string, userAgent?: string): Promise<void> {
    await this.log({
      type: success ? SecurityEventType.UNAUTHORIZED_ACCESS : SecurityEventType.UNAUTHORIZED_ACCESS,
      severity: success ? 'low' : 'medium',
      timestamp: Date.now(),
      description: success ? 'Successful authentication' : 'Failed authentication attempt',
      metadata: {
        userId,
        ip,
        userAgent,
        success
      }
    });
  }

  /**
   * Log API usage
   */
  async logAPIUsage(endpoint: string, method: string, statusCode: number, responseTime: number, userId?: string): Promise<void> {
    const severity = statusCode >= 400 ? 'medium' : 'low';
    
    await this.log({
      type: SecurityEventType.UNAUTHORIZED_ACCESS,
      severity,
      timestamp: Date.now(),
      description: `API ${method} ${endpoint} - ${statusCode}`,
      metadata: {
        endpoint,
        method,
        statusCode,
        responseTime,
        userId
      }
    });
  }

  /**
   * Log data access
   */
  async logDataAccess(resource: string, action: 'read' | 'write' | 'delete', userId?: string, success: boolean = true): Promise<void> {
    await this.log({
      type: SecurityEventType.UNAUTHORIZED_ACCESS,
      severity: success ? 'low' : 'high',
      timestamp: Date.now(),
      description: `Data ${action} on ${resource}`,
      metadata: {
        resource,
        action,
        userId,
        success
      }
    });
  }

  /**
   * Flush buffered events to storage
   */
  async flush(): Promise<void> {
    if (this.eventBuffer.length === 0) {
      return;
    }

    const events = [...this.eventBuffer];
    this.eventBuffer.length = 0; // Clear buffer

    try {
      // Write to file
      await this.writeToFile(events);

      // Send to remote endpoint if enabled
      if (this.config.enableRemoteLogging && this.config.remoteEndpoint) {
        await this.sendToRemote(events);
      }

      this.emit('eventsFlushed', { count: events.length });
    } catch (error) {
      // Add events back to buffer if write failed
      this.eventBuffer.unshift(...events);
      this.emit('flushError', error);
    }
  }

  /**
   * Query audit logs
   */
  async queryLogs(filter: {
    startDate?: Date;
    endDate?: Date;
    severity?: string;
    type?: SecurityEventType;
    userId?: string;
    limit?: number;
  }): Promise<SecurityEvent[]> {
    const logFiles = await this.getLogFiles();
    const results: SecurityEvent[] = [];

    for (const file of logFiles) {
      try {
        const content = await fs.readFile(file, 'utf8');
        const lines = content.split('\n').filter(line => line.trim());
        
        for (const line of lines) {
          try {
            const event = JSON.parse(line);
            if (this.matchesFilter(event, filter)) {
              results.push(event);
              
              if (filter.limit && results.length >= filter.limit) {
                return results;
              }
            }
          } catch {
            // Skip invalid lines
          }
        }
      } catch {
        // Skip unreadable files
      }
    }

    return results.sort((a, b) => b.timestamp - a.timestamp);
  }

  /**
   * Get security statistics
   */
  async getStats(timeRange: { start: Date; end: Date }): Promise<{
    totalEvents: number;
    eventsBySeverity: Record<string, number>;
    eventsByType: Record<string, number>;
    topIPs: Array<{ ip: string; count: number }>;
    topUsers: Array<{ userId: string; count: number }>;
  }> {
    const events = await this.queryLogs({
      startDate: timeRange.start,
      endDate: timeRange.end
    });

    const stats = {
      totalEvents: events.length,
      eventsBySeverity: {} as Record<string, number>,
      eventsByType: {} as Record<string, number>,
      topIPs: [] as Array<{ ip: string; count: number }>,
      topUsers: [] as Array<{ userId: string; count: number }>
    };

    const ipCounts = new Map<string, number>();
    const userCounts = new Map<string, number>();

    for (const event of events) {
      // Count by severity
      stats.eventsBySeverity[event.severity] = (stats.eventsBySeverity[event.severity] || 0) + 1;
      
      // Count by type
      stats.eventsByType[event.type] = (stats.eventsByType[event.type] || 0) + 1;
      
      // Count IPs
      const ip = event.metadata?.ip;
      if (ip) {
        ipCounts.set(ip, (ipCounts.get(ip) || 0) + 1);
      }
      
      // Count users
      const userId = event.metadata?.userId;
      if (userId) {
        userCounts.set(userId, (userCounts.get(userId) || 0) + 1);
      }
    }

    // Top IPs
    stats.topIPs = Array.from(ipCounts.entries())
      .map(([ip, count]) => ({ ip, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Top users
    stats.topUsers = Array.from(userCounts.entries())
      .map(([userId, count]) => ({ userId, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    return stats;
  }

  /**
   * Archive old logs
   */
  async archiveLogs(olderThanDays: number): Promise<void> {
    const cutoffDate = new Date(Date.now() - olderThanDays * 24 * 60 * 60 * 1000);
    const logFiles = await this.getLogFiles();

    for (const file of logFiles) {
      try {
        const stats = await fs.stat(file);
        if (stats.mtime < cutoffDate) {
          const archivePath = file.replace('.log', '.archive');
          await fs.rename(file, archivePath);
          this.emit('logArchived', { file, archivePath });
        }
      } catch (error) {
        this.emit('archiveError', { file, error });
      }
    }
  }

  /**
   * Shutdown auditor
   */
  async shutdown(): Promise<void> {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
    }
    
    if (this.logRotationTimer) {
      clearInterval(this.logRotationTimer);
    }

    await this.flush();
  }

  private async initialize(): Promise<void> {
    // Create log directory
    try {
      await fs.mkdir(this.config.logDirectory, { recursive: true, mode: 0o700 });
    } catch (error) {
      console.error('Failed to create audit log directory:', error);
    }

    // Set up periodic flushing
    this.flushTimer = setInterval(async () => {
      await this.flush();
    }, this.config.flushInterval);

    // Set up daily log rotation if enabled
    if (this.config.rotateDaily) {
      this.setupLogRotation();
    }

    this.currentLogFile = this.getCurrentLogFile();
  }

  private async writeToFile(events: SecurityEvent[]): Promise<void> {
    if (!this.currentLogFile) {
      this.currentLogFile = this.getCurrentLogFile();
    }

    const logEntries = events.map(event => JSON.stringify(event)).join('\n') + '\n';
    
    try {
      await fs.appendFile(this.currentLogFile, logEntries, { mode: 0o600 });
      
      // Check file size for rotation
      const stats = await fs.stat(this.currentLogFile);
      if (stats.size > this.config.maxLogSize) {
        await this.rotateLog();
      }
    } catch (error) {
      console.error('Failed to write audit log:', error);
      throw error;
    }
  }

  private async sendToRemote(events: SecurityEvent[]): Promise<void> {
    try {
      const response = await fetch(this.config.remoteEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'HyperSim-SDK-Auditor'
        },
        body: JSON.stringify({ events })
      });

      if (!response.ok) {
        throw new Error(`Remote logging failed: ${response.status}`);
      }
    } catch (error) {
      this.emit('remoteLoggingError', error);
      throw error;
    }
  }

  private getCurrentLogFile(): string {
    const today = new Date().toISOString().split('T')[0];
    return path.join(this.config.logDirectory, `security-audit-${today}.log`);
  }

  private async rotateLog(): Promise<void> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const rotatedFile = this.currentLogFile!.replace('.log', `-${timestamp}.log`);
    
    try {
      await fs.rename(this.currentLogFile!, rotatedFile);
      this.currentLogFile = this.getCurrentLogFile();
      this.emit('logRotated', { oldFile: rotatedFile, newFile: this.currentLogFile });
    } catch (error) {
      this.emit('rotationError', error);
    }
  }

  private setupLogRotation(): void {
    // Rotate at midnight
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    
    const msUntilMidnight = tomorrow.getTime() - now.getTime();
    
    setTimeout(() => {
      this.rotateLog();
      
      // Set up daily rotation
      this.logRotationTimer = setInterval(() => {
        this.rotateLog();
      }, 24 * 60 * 60 * 1000);
    }, msUntilMidnight);
  }

  private async getLogFiles(): Promise<string[]> {
    try {
      const files = await fs.readdir(this.config.logDirectory);
      return files
        .filter(file => file.endsWith('.log'))
        .map(file => path.join(this.config.logDirectory, file))
        .sort();
    } catch {
      return [];
    }
  }

  private matchesFilter(event: SecurityEvent, filter: any): boolean {
    if (filter.startDate && event.timestamp < filter.startDate.getTime()) {
      return false;
    }
    
    if (filter.endDate && event.timestamp > filter.endDate.getTime()) {
      return false;
    }
    
    if (filter.severity && event.severity !== filter.severity) {
      return false;
    }
    
    if (filter.type && event.type !== filter.type) {
      return false;
    }
    
    if (filter.userId && event.metadata?.userId !== filter.userId) {
      return false;
    }
    
    return true;
  }
}

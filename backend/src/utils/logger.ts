/**
 * Logger Implementation
 * Structured logging with level support, rotation, and retention policies
 */

import { EventEmitter } from 'events';
import * as fs from 'fs';
import * as path from 'path';

export type LogLevel = 'DEBUG' | 'INFO' | 'WARN' | 'ERROR';

export interface LogEntry {
  timestamp: number;
  level: LogLevel;
  component: string;
  message: string;
  context?: any;
  stack?: string;
}

export interface LoggerConfig {
  logDir: string;
  maxFileSize: number; // bytes
  maxRetentionDays: number;
  enableConsole: boolean;
  enableFile: boolean;
  logLevel: LogLevel;
}

export class Logger extends EventEmitter {
  private config: LoggerConfig;
  private logs: LogEntry[] = [];
  private readonly maxLogsInMemory: number = 10000;
  private currentLogFile: string | null = null;
  private rotationTimer: NodeJS.Timeout | null = null;
  private retentionTimer: NodeJS.Timeout | null = null;

  private static readonly LOG_LEVELS: Record<LogLevel, number> = {
    DEBUG: 0,
    INFO: 1,
    WARN: 2,
    ERROR: 3,
  };

  constructor(config: Partial<LoggerConfig> = {}) {
    super();
    this.config = {
      logDir: config.logDir || './logs',
      maxFileSize: config.maxFileSize || 100 * 1024 * 1024, // 100MB
      maxRetentionDays: config.maxRetentionDays || 30,
      enableConsole: config.enableConsole !== false,
      enableFile: config.enableFile !== false,
      logLevel: config.logLevel || 'INFO',
    };

    this.ensureLogDirectory();
    this.startRotationSchedule();
    this.startRetentionSchedule();
  }

  /**
   * Log a message
   */
  log(
    level: LogLevel,
    component: string,
    message: string,
    context?: any
  ): void {
    // Note: We always log to memory regardless of level, but respect level for console/file output
    // This allows filtering at retrieval time

    const entry: LogEntry = {
      timestamp: Date.now(),
      level,
      component,
      message,
      context,
    };

    // Add stack trace for errors
    if (level === 'ERROR' && context instanceof Error) {
      entry.stack = context.stack;
    }

    // Store in memory
    this.logs.push(entry);
    if (this.logs.length > this.maxLogsInMemory) {
      this.logs.shift();
    }

    // Log to console
    if (this.config.enableConsole) {
      this.logToConsole(entry);
    }

    // Log to file
    if (this.config.enableFile) {
      this.logToFile(entry);
    }

    this.emit('log:entry', entry);
  }

  /**
   * Log debug message
   */
  debug(component: string, message: string, context?: any): void {
    this.log('DEBUG', component, message, context);
  }

  /**
   * Log info message
   */
  info(component: string, message: string, context?: any): void {
    this.log('INFO', component, message, context);
  }

  /**
   * Log warning message
   */
  warn(component: string, message: string, context?: any): void {
    this.log('WARN', component, message, context);
  }

  /**
   * Log error message
   */
  error(component: string, message: string, context?: any): void {
    this.log('ERROR', component, message, context);
  }

  /**
   * Log to console
   */
  private logToConsole(entry: LogEntry): void {
    const timestamp = new Date(entry.timestamp).toISOString();
    const logMessage = `[${timestamp}] [${entry.level}] [${entry.component}] ${entry.message}`;

    switch (entry.level) {
      case 'DEBUG':
        console.debug(logMessage, entry.context || '');
        break;
      case 'INFO':
        console.info(logMessage, entry.context || '');
        break;
      case 'WARN':
        console.warn(logMessage, entry.context || '');
        break;
      case 'ERROR':
        console.error(logMessage, entry.context || '');
        if (entry.stack) {
          console.error(entry.stack);
        }
        break;
    }
  }

  /**
   * Log to file
   */
  private logToFile(entry: LogEntry): void {
    try {
      const timestamp = new Date(entry.timestamp).toISOString();
      const logMessage = `[${timestamp}] [${entry.level}] [${entry.component}] ${entry.message}`;
      const contextStr = entry.context
        ? `\n  Context: ${JSON.stringify(entry.context)}`
        : '';
      const stackStr = entry.stack ? `\n  Stack: ${entry.stack}` : '';

      const fullMessage = `${logMessage}${contextStr}${stackStr}\n`;

      // Get current log file
      const logFile = this.getCurrentLogFile();

      // Check if rotation is needed
      if (this.shouldRotate(logFile)) {
        this.rotateLogFile();
      }

      // Append to file
      fs.appendFileSync(logFile, fullMessage);
    } catch (error) {
      console.error('Failed to write log to file:', error);
    }
  }

  /**
   * Get current log file path
   */
  private getCurrentLogFile(): string {
    if (!this.currentLogFile) {
      const date = new Date();
      const dateStr = date.toISOString().split('T')[0];
      this.currentLogFile = path.join(
        this.config.logDir,
        `app-${dateStr}.log`
      );
    }
    return this.currentLogFile;
  }

  /**
   * Check if log file should be rotated
   */
  private shouldRotate(logFile: string): boolean {
    try {
      if (!fs.existsSync(logFile)) {
        return false;
      }

      const stats = fs.statSync(logFile);
      return stats.size > this.config.maxFileSize;
    } catch (error) {
      return false;
    }
  }

  /**
   * Rotate log file
   */
  private rotateLogFile(): void {
    try {
      const currentFile = this.getCurrentLogFile();
      if (!fs.existsSync(currentFile)) {
        return;
      }

      const timestamp = Date.now();
      const rotatedFile = currentFile.replace(
        '.log',
        `-${timestamp}.log`
      );

      fs.renameSync(currentFile, rotatedFile);
      this.currentLogFile = null; // Reset to create new file

      this.emit('log:rotated', { from: currentFile, to: rotatedFile });
    } catch (error) {
      console.error('Failed to rotate log file:', error);
    }
  }

  /**
   * Ensure log directory exists
   */
  private ensureLogDirectory(): void {
    try {
      if (!fs.existsSync(this.config.logDir)) {
        fs.mkdirSync(this.config.logDir, { recursive: true });
      }
    } catch (error) {
      console.error('Failed to create log directory:', error);
    }
  }

  /**
   * Start daily rotation schedule
   */
  private startRotationSchedule(): void {
    // Schedule rotation at midnight
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);

    const msUntilMidnight = tomorrow.getTime() - now.getTime();

    this.rotationTimer = setTimeout(() => {
      this.rotateLogFile();
      // Reschedule for next day
      this.startRotationSchedule();
    }, msUntilMidnight);
  }

  /**
   * Start retention cleanup schedule
   */
  private startRetentionSchedule(): void {
    // Run cleanup every 6 hours
    this.retentionTimer = setInterval(() => {
      this.cleanupOldLogs();
    }, 6 * 60 * 60 * 1000);
  }

  /**
   * Clean up old log files based on retention policy
   */
  private cleanupOldLogs(): void {
    try {
      const files = fs.readdirSync(this.config.logDir);
      const now = Date.now();
      const retentionMs = this.config.maxRetentionDays * 24 * 60 * 60 * 1000;

      for (const file of files) {
        if (!file.startsWith('app-') || !file.endsWith('.log')) {
          continue;
        }

        const filePath = path.join(this.config.logDir, file);
        const stats = fs.statSync(filePath);
        const fileAge = now - stats.mtimeMs;

        if (fileAge > retentionMs) {
          fs.unlinkSync(filePath);
          this.emit('log:deleted', { file: filePath, age: fileAge });
        }
      }
    } catch (error) {
      console.error('Failed to cleanup old logs:', error);
    }
  }

  /**
   * Get logs from memory
   */
  getLogs(limit?: number): LogEntry[] {
    if (limit === undefined) {
      return [...this.logs];
    }
    return this.logs.slice(-limit);
  }

  /**
   * Get logs by level
   */
  getLogsByLevel(level: LogLevel, limit?: number): LogEntry[] {
    const filtered = this.logs.filter((log) => log.level === level);
    if (limit === undefined) {
      return filtered;
    }
    return filtered.slice(-limit);
  }

  /**
   * Get logs by component
   */
  getLogsByComponent(component: string, limit?: number): LogEntry[] {
    const filtered = this.logs.filter((log) => log.component === component);
    if (limit === undefined) {
      return filtered;
    }
    return filtered.slice(-limit);
  }

  /**
   * Get logs in time range
   */
  getLogsInRange(startTime: number, endTime: number): LogEntry[] {
    return this.logs.filter(
      (log) => log.timestamp >= startTime && log.timestamp <= endTime
    );
  }

  /**
   * Clear in-memory logs
   */
  clearMemoryLogs(): void {
    this.logs = [];
    this.emit('logger:cleared');
  }

  /**
   * Get logger statistics
   */
  getStats(): {
    logsInMemory: number;
    maxLogsInMemory: number;
    logDir: string;
    logFiles: number;
  } {
    let logFiles = 0;
    try {
      const files = fs.readdirSync(this.config.logDir);
      logFiles = files.filter(
        (f) => f.startsWith('app-') && f.endsWith('.log')
      ).length;
    } catch (error) {
      // Ignore
    }

    return {
      logsInMemory: this.logs.length,
      maxLogsInMemory: this.maxLogsInMemory,
      logDir: this.config.logDir,
      logFiles,
    };
  }

  /**
   * Destroy the logger
   */
  destroy(): void {
    if (this.rotationTimer) {
      clearTimeout(this.rotationTimer);
    }
    if (this.retentionTimer) {
      clearInterval(this.retentionTimer);
    }
    this.clearMemoryLogs();
    this.removeAllListeners();
  }
}

export default Logger;

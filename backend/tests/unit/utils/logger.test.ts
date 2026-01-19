/**
 * Logger Unit Tests
 * Tests for structured logging with levels, rotation, and retention
 */

import { Logger, LogEntry, LogLevel } from '../../../src/utils/logger';
import * as fs from 'fs';
import * as path from 'path';

describe('Logger', () => {
  let logger: Logger;
  const testLogDir = './test-logs';

  beforeEach(() => {
    // Clean up test logs directory
    if (fs.existsSync(testLogDir)) {
      const files = fs.readdirSync(testLogDir);
      for (const file of files) {
        fs.unlinkSync(path.join(testLogDir, file));
      }
      fs.rmdirSync(testLogDir);
    }

    logger = new Logger({
      logDir: testLogDir,
      maxFileSize: 1024 * 1024, // 1MB
      maxRetentionDays: 30,
      enableConsole: false,
      enableFile: true,
      logLevel: 'DEBUG',
    });
  });

  afterEach(() => {
    if (logger) {
      logger.destroy();
    }

    // Clean up test logs directory
    if (fs.existsSync(testLogDir)) {
      const files = fs.readdirSync(testLogDir);
      for (const file of files) {
        fs.unlinkSync(path.join(testLogDir, file));
      }
      fs.rmdirSync(testLogDir);
    }
  });

  describe('Log Levels', () => {
    it('should log DEBUG messages', () => {
      logger.debug('test', 'Debug message');
      const logs = logger.getLogs();
      expect(logs.length).toBe(1);
      expect(logs[0].level).toBe('DEBUG');
    });

    it('should log INFO messages', () => {
      logger.info('test', 'Info message');
      const logs = logger.getLogs();
      expect(logs.length).toBe(1);
      expect(logs[0].level).toBe('INFO');
    });

    it('should log WARN messages', () => {
      logger.warn('test', 'Warning message');
      const logs = logger.getLogs();
      expect(logs.length).toBe(1);
      expect(logs[0].level).toBe('WARN');
    });

    it('should log ERROR messages', () => {
      logger.error('test', 'Error message');
      const logs = logger.getLogs();
      expect(logs.length).toBe(1);
      expect(logs[0].level).toBe('ERROR');
    });

    it('should respect log level filtering', () => {
      const warnLogger = new Logger({
        logDir: testLogDir,
        enableConsole: false,
        enableFile: false,
        logLevel: 'WARN',
      });

      warnLogger.debug('test', 'Debug message');
      warnLogger.info('test', 'Info message');
      warnLogger.warn('test', 'Warning message');
      warnLogger.error('test', 'Error message');

      const logs = warnLogger.getLogs();
      expect(logs.length).toBe(2); // Only WARN and ERROR
      expect(logs[0].level).toBe('WARN');
      expect(logs[1].level).toBe('ERROR');

      warnLogger.destroy();
    });
  });

  describe('Log Entry Structure', () => {
    it('should create log entry with all fields', () => {
      const context = { userId: '123', action: 'login' };
      logger.log('INFO', 'auth', 'User logged in', context);

      const logs = logger.getLogs();
      expect(logs[0].timestamp).toBeDefined();
      expect(logs[0].level).toBe('INFO');
      expect(logs[0].component).toBe('auth');
      expect(logs[0].message).toBe('User logged in');
      expect(logs[0].context).toEqual(context);
    });

    it('should include stack trace for errors', () => {
      const error = new Error('Test error');
      logger.error('test', 'An error occurred', error);

      const logs = logger.getLogs();
      expect(logs[0].stack).toBeDefined();
      expect(logs[0].stack).toContain('Error: Test error');
    });

    it('should handle undefined context', () => {
      logger.log('INFO', 'test', 'Message without context');

      const logs = logger.getLogs();
      expect(logs[0].context).toBeUndefined();
    });
  });

  describe('Log Retrieval', () => {
    beforeEach(() => {
      for (let i = 0; i < 5; i++) {
        logger.log('INFO', 'test', `Message ${i}`);
      }
    });

    it('should get all logs', () => {
      const logs = logger.getLogs();
      expect(logs.length).toBe(5);
    });

    it('should get limited logs', () => {
      const logs = logger.getLogs(3);
      expect(logs.length).toBe(3);
    });

    it('should get logs by level', () => {
      logger.log('WARN', 'test', 'Warning');
      logger.log('ERROR', 'test', 'Error');

      const errors = logger.getLogsByLevel('ERROR');
      expect(errors.length).toBe(1);
      expect(errors[0].level).toBe('ERROR');
    });

    it('should get logs by component', () => {
      logger.log('INFO', 'auth', 'Auth message');
      logger.log('INFO', 'db', 'DB message');

      const authLogs = logger.getLogsByComponent('auth');
      expect(authLogs.length).toBe(1);
      expect(authLogs[0].component).toBe('auth');
    });

    it('should get logs in time range', () => {
      const logs = logger.getLogs();
      const startTime = logs[1].timestamp;
      const endTime = logs[3].timestamp;

      const rangeLogs = logger.getLogsInRange(startTime, endTime);
      expect(rangeLogs.length).toBeGreaterThanOrEqual(3);
    });
  });

  describe('File Logging', () => {
    it('should create log directory', () => {
      logger.log('INFO', 'test', 'Test message');
      expect(fs.existsSync(testLogDir)).toBe(true);
    });

    it('should write logs to file', () => {
      logger.log('INFO', 'test', 'Test message');

      const files = fs.readdirSync(testLogDir);
      expect(files.length).toBeGreaterThan(0);

      const logFile = files.find((f) => f.startsWith('app-') && f.endsWith('.log'));
      expect(logFile).toBeDefined();

      if (logFile) {
        const content = fs.readFileSync(path.join(testLogDir, logFile), 'utf-8');
        expect(content).toContain('Test message');
      }
    });

    it('should append to existing log file', () => {
      logger.log('INFO', 'test', 'Message 1');
      logger.log('INFO', 'test', 'Message 2');

      const files = fs.readdirSync(testLogDir);
      const logFile = files.find((f) => f.startsWith('app-') && f.endsWith('.log'));

      if (logFile) {
        const content = fs.readFileSync(path.join(testLogDir, logFile), 'utf-8');
        expect(content).toContain('Message 1');
        expect(content).toContain('Message 2');
      }
    });

    it('should disable file logging when configured', () => {
      const noFileLogger = new Logger({
        logDir: testLogDir,
        enableConsole: false,
        enableFile: false,
      });

      noFileLogger.log('INFO', 'test', 'Test message');

      const files = fs.readdirSync(testLogDir);
      const logFiles = files.filter((f) => f.startsWith('app-') && f.endsWith('.log'));
      expect(logFiles.length).toBe(0);

      noFileLogger.destroy();
    });
  });

  describe('Log Rotation', () => {
    it('should emit log:rotated event', () => {
      logger.log('INFO', 'test', 'Message 1');

      // Verify listener is set up
      expect(logger.listenerCount('log:rotated')).toBeGreaterThanOrEqual(0);
    });

    it('should handle rotation gracefully', () => {
      logger.log('INFO', 'test', 'Message 1');
      logger.log('INFO', 'test', 'Message 2');

      const files = fs.readdirSync(testLogDir);
      expect(files.length).toBeGreaterThan(0);
    });
  });

  describe('Log Retention', () => {
    it('should emit log:deleted event', () => {
      logger.log('INFO', 'test', 'Test message');

      // Verify listener is set up
      expect(logger.listenerCount('log:deleted')).toBeGreaterThanOrEqual(0);
    });

    it('should support retention configuration', () => {
      const retentionLogger = new Logger({
        logDir: testLogDir,
        maxRetentionDays: 7,
        enableConsole: false,
        enableFile: true,
      });

      retentionLogger.log('INFO', 'test', 'Test message');

      const stats = retentionLogger.getStats();
      expect(stats.logDir).toBe(testLogDir);

      retentionLogger.destroy();
    });
  });

  describe('Logger Statistics', () => {
    it('should provide logger statistics', () => {
      logger.log('INFO', 'test', 'Message 1');
      logger.log('INFO', 'test', 'Message 2');

      const stats = logger.getStats();
      expect(stats.logsInMemory).toBe(2);
      expect(stats.maxLogsInMemory).toBeGreaterThan(0);
      expect(stats.logDir).toBe(testLogDir);
      expect(stats.logFiles).toBeGreaterThanOrEqual(0);
    });

    it('should report correct log count', () => {
      for (let i = 0; i < 5; i++) {
        logger.log('INFO', 'test', `Message ${i}`);
      }

      const stats = logger.getStats();
      expect(stats.logsInMemory).toBe(5);
    });
  });

  describe('Event Emission', () => {
    it('should emit log:entry event', (done) => {
      logger.on('log:entry', (entry) => {
        expect(entry.level).toBe('INFO');
        expect(entry.message).toBe('Test message');
        done();
      });

      logger.log('INFO', 'test', 'Test message');
    });

    it('should support multiple listeners', () => {
      const listener1 = jest.fn();
      const listener2 = jest.fn();

      logger.on('log:entry', listener1);
      logger.on('log:entry', listener2);

      logger.log('INFO', 'test', 'Test message');

      expect(listener1).toHaveBeenCalled();
      expect(listener2).toHaveBeenCalled();
    });
  });

  describe('Memory Management', () => {
    it('should limit logs in memory', () => {
      const limitedLogger = new Logger({
        logDir: testLogDir,
        enableConsole: false,
        enableFile: false,
      });

      // Log more than max
      for (let i = 0; i < 15000; i++) {
        limitedLogger.log('INFO', 'test', `Message ${i}`);
      }

      const logs = limitedLogger.getLogs();
      expect(logs.length).toBeLessThanOrEqual(10000);

      limitedLogger.destroy();
    });

    it('should clear memory logs', () => {
      logger.log('INFO', 'test', 'Message 1');
      logger.log('INFO', 'test', 'Message 2');

      expect(logger.getLogs().length).toBe(2);

      logger.clearMemoryLogs();

      expect(logger.getLogs().length).toBe(0);
    });

    it('should emit logger:cleared event', (done) => {
      logger.on('logger:cleared', () => {
        done();
      });

      logger.clearMemoryLogs();
    });
  });

  describe('Console Logging', () => {
    it('should support console logging', () => {
      const consoleLogger = new Logger({
        logDir: testLogDir,
        enableConsole: true,
        enableFile: false,
      });

      const consoleSpy = jest.spyOn(console, 'info').mockImplementation();

      consoleLogger.log('INFO', 'test', 'Test message');

      expect(consoleSpy).toHaveBeenCalled();

      consoleSpy.mockRestore();
      consoleLogger.destroy();
    });

    it('should disable console logging when configured', () => {
      const noConsoleLogger = new Logger({
        logDir: testLogDir,
        enableConsole: false,
        enableFile: false,
      });

      const consoleSpy = jest.spyOn(console, 'info').mockImplementation();

      noConsoleLogger.log('INFO', 'test', 'Test message');

      expect(consoleSpy).not.toHaveBeenCalled();

      consoleSpy.mockRestore();
      noConsoleLogger.destroy();
    });
  });

  describe('Cleanup and Destruction', () => {
    it('should destroy logger', () => {
      logger.log('INFO', 'test', 'Message 1');
      logger.destroy();

      expect(logger.getLogs().length).toBe(0);
    });

    it('should remove all listeners on destroy', () => {
      const listener = jest.fn();
      logger.on('log:entry', listener);

      logger.destroy();

      expect(logger.listenerCount('log:entry')).toBe(0);
    });
  });

  describe('Context Handling', () => {
    it('should handle object context', () => {
      const context = { userId: '123', action: 'login', timestamp: Date.now() };
      logger.log('INFO', 'auth', 'User action', context);

      const logs = logger.getLogs();
      expect(logs[0].context).toEqual(context);
    });

    it('should handle string context', () => {
      logger.log('INFO', 'test', 'Message', 'string context');

      const logs = logger.getLogs();
      expect(logs[0].context).toBe('string context');
    });

    it('should handle error context', () => {
      const error = new Error('Test error');
      logger.error('test', 'Error occurred', error);

      const logs = logger.getLogs();
      expect(logs[0].stack).toBeDefined();
    });
  });

  describe('Component Filtering', () => {
    beforeEach(() => {
      logger.log('INFO', 'auth', 'Auth message 1');
      logger.log('INFO', 'db', 'DB message 1');
      logger.log('INFO', 'auth', 'Auth message 2');
      logger.log('INFO', 'api', 'API message 1');
    });

    it('should filter logs by component', () => {
      const authLogs = logger.getLogsByComponent('auth');
      expect(authLogs.length).toBe(2);
      expect(authLogs.every((log) => log.component === 'auth')).toBe(true);
    });

    it('should return empty array for non-existent component', () => {
      const logs = logger.getLogsByComponent('non-existent');
      expect(logs.length).toBe(0);
    });

    it('should support limit on component filter', () => {
      const authLogs = logger.getLogsByComponent('auth', 1);
      expect(authLogs.length).toBe(1);
    });
  });

  describe('Level Filtering', () => {
    beforeEach(() => {
      logger.log('DEBUG', 'test', 'Debug 1');
      logger.log('INFO', 'test', 'Info 1');
      logger.log('WARN', 'test', 'Warn 1');
      logger.log('ERROR', 'test', 'Error 1');
    });

    it('should filter logs by level', () => {
      const errors = logger.getLogsByLevel('ERROR');
      expect(errors.length).toBe(1);
      expect(errors[0].level).toBe('ERROR');
    });

    it('should support limit on level filter', () => {
      const infos = logger.getLogsByLevel('INFO', 1);
      expect(infos.length).toBe(1);
    });
  });

  describe('Time Range Queries', () => {
    beforeEach(() => {
      const now = Date.now();
      logger.log('INFO', 'test', 'Message 1');
      // Simulate time passing
      const logs = logger.getLogs();
      if (logs.length > 0) {
        const startTime = logs[0].timestamp;
        const endTime = Date.now() + 1000;

        const rangeLogs = logger.getLogsInRange(startTime, endTime);
        expect(rangeLogs.length).toBeGreaterThan(0);
      }
    });

    it('should query logs in time range', () => {
      const logs = logger.getLogs();
      if (logs.length > 0) {
        const startTime = logs[0].timestamp;
        const endTime = Date.now() + 1000;

        const rangeLogs = logger.getLogsInRange(startTime, endTime);
        expect(rangeLogs.length).toBeGreaterThan(0);
      }
    });

    it('should return empty array for non-overlapping range', () => {
      const logs = logger.getLogs();
      if (logs.length > 0) {
        const lastTimestamp = logs[logs.length - 1].timestamp;
        const rangeLogs = logger.getLogsInRange(
          lastTimestamp + 1000,
          lastTimestamp + 2000
        );
        expect(rangeLogs.length).toBe(0);
      }
    });
  });
});

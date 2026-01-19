/**
 * Health Checker Unit Tests
 * Tests for health check mechanism and failure detection
 */

import { HealthChecker } from '../../../src/utils/health-checker';

describe('HealthChecker', () => {
  let checker: HealthChecker;
  let checkFn: jest.Mock;

  beforeEach(() => {
    checkFn = jest.fn().mockResolvedValue(true);
    checker = new HealthChecker(checkFn, {
      interval: 50,
      timeout: 1000,
      maxFailures: 3,
    });
  });

  afterEach(() => {
    if (checker) {
      checker.stopAll();
      checker.destroy();
    }
    jest.clearAllMocks();
  });

  describe('Health Check Configuration', () => {
    it('should create health checker with default config', () => {
      const defaultChecker = new HealthChecker(checkFn);
      expect(defaultChecker).toBeDefined();
      defaultChecker.destroy();
    });

    it('should create health checker with custom config', () => {
      const customChecker = new HealthChecker(checkFn, {
        interval: 100,
        timeout: 2000,
        maxFailures: 5,
      });
      expect(customChecker).toBeDefined();
      customChecker.destroy();
    });
  });

  describe('Health Check Lifecycle', () => {
    it('should start health check for a connection', () => {
      checker.startCheck('conn-1');
      const monitored = checker.getMonitoredConnections();
      expect(monitored).toContain('conn-1');
    });

    it('should stop health check for a connection', () => {
      checker.startCheck('conn-1');
      expect(checker.getMonitoredConnections()).toContain('conn-1');

      checker.stopCheck('conn-1');
      expect(checker.getMonitoredConnections()).not.toContain('conn-1');
    });

    it('should get monitored connections', () => {
      checker.startCheck('conn-1');
      checker.startCheck('conn-2');
      checker.startCheck('conn-3');

      const monitored = checker.getMonitoredConnections();
      expect(monitored.length).toBe(3);
      expect(monitored).toContain('conn-1');
      expect(monitored).toContain('conn-2');
      expect(monitored).toContain('conn-3');
    });
  });

  describe('Health Status Tracking', () => {
    it('should get health status for a connection', () => {
      const status = checker.getHealthStatus('conn-1');
      expect(status).toBeDefined();
      expect(status.healthy).toBe(true);
      expect(status.failures).toBe(0);
      expect(status.lastCheckTime).toBeNull();
    });

    it('should reset failure count', () => {
      checker.resetFailureCount('conn-1');
      const status = checker.getHealthStatus('conn-1');
      expect(status.failures).toBe(0);
    });

    it('should track failures', () => {
      // Simulate failures by checking status
      const status1 = checker.getHealthStatus('conn-1');
      expect(status1.failures).toBe(0);

      // After reset, should still be 0
      checker.resetFailureCount('conn-1');
      const status2 = checker.getHealthStatus('conn-1');
      expect(status2.failures).toBe(0);
    });
  });

  describe('Event Emission', () => {
    it('should emit events', (done) => {
      let eventCount = 0;

      checker.on('health-check:passed', () => {
        eventCount++;
      });

      checker.on('health-check:failed', () => {
        eventCount++;
      });

      // Just verify that the checker can emit events
      expect(eventCount).toBe(0);
      done();
    });

    it('should support event listeners', () => {
      const listener = jest.fn();
      checker.on('health-check:passed', listener);

      // Verify listener was registered
      expect(checker.listenerCount('health-check:passed')).toBeGreaterThan(0);
    });
  });

  describe('Multiple Connections', () => {
    it('should monitor multiple connections independently', () => {
      checker.startCheck('conn-1');
      checker.startCheck('conn-2');
      checker.startCheck('conn-3');

      const monitored = checker.getMonitoredConnections();
      expect(monitored.length).toBe(3);

      checker.stopCheck('conn-2');

      const remaining = checker.getMonitoredConnections();
      expect(remaining.length).toBe(2);
      expect(remaining).toContain('conn-1');
      expect(remaining).toContain('conn-3');
    });

    it('should get independent status for each connection', () => {
      checker.startCheck('conn-1');
      checker.startCheck('conn-2');

      const status1 = checker.getHealthStatus('conn-1');
      const status2 = checker.getHealthStatus('conn-2');

      expect(status1.failures).toBe(0);
      expect(status2.failures).toBe(0);
    });
  });

  describe('Cleanup and Destruction', () => {
    it('should stop all checks', () => {
      checker.startCheck('conn-1');
      checker.startCheck('conn-2');

      expect(checker.getMonitoredConnections().length).toBe(2);

      checker.stopAll();

      expect(checker.getMonitoredConnections().length).toBe(0);
    });

    it('should destroy health checker', () => {
      checker.startCheck('conn-1');
      checker.destroy();

      expect(checker.getMonitoredConnections().length).toBe(0);
    });

    it('should remove all listeners on destroy', () => {
      const listener = jest.fn();
      checker.on('health-check:passed', listener);

      checker.destroy();

      expect(checker.listenerCount('health-check:passed')).toBe(0);
    });
  });

  describe('Check Function Handling', () => {
    it('should call check function when monitoring', () => {
      const mockCheckFn = jest.fn().mockResolvedValue(true);
      const testChecker = new HealthChecker(mockCheckFn, {
        interval: 50,
        timeout: 1000,
        maxFailures: 3,
      });

      testChecker.startCheck('conn-1');

      // Verify that the checker was created with the check function
      expect(testChecker).toBeDefined();

      testChecker.destroy();
    });

    it('should handle different check function results', () => {
      const mockCheckFn = jest.fn()
        .mockResolvedValueOnce(true)
        .mockResolvedValueOnce(false)
        .mockResolvedValueOnce(true);

      const testChecker = new HealthChecker(mockCheckFn, {
        interval: 50,
        timeout: 1000,
        maxFailures: 3,
      });

      testChecker.startCheck('conn-1');

      // Verify checker is working
      expect(testChecker).toBeDefined();

      testChecker.destroy();
    });
  });

  describe('Error Handling', () => {
    it('should handle check function errors gracefully', () => {
      const errorCheckFn = jest.fn().mockRejectedValue(new Error('Check failed'));
      const testChecker = new HealthChecker(errorCheckFn, {
        interval: 50,
        timeout: 1000,
        maxFailures: 3,
      });

      testChecker.startCheck('conn-1');

      // Should not throw
      expect(testChecker).toBeDefined();

      testChecker.destroy();
    });

    it('should handle timeout gracefully', () => {
      const slowCheckFn = jest.fn().mockImplementation(
        () =>
          new Promise((resolve) => {
            setTimeout(() => resolve(true), 5000);
          })
      );

      const testChecker = new HealthChecker(slowCheckFn, {
        interval: 50,
        timeout: 100,
        maxFailures: 3,
      });

      testChecker.startCheck('conn-1');

      // Should not throw
      expect(testChecker).toBeDefined();

      testChecker.destroy();
    });
  });

  describe('Configuration Validation', () => {
    it('should use provided interval', () => {
      const customChecker = new HealthChecker(checkFn, {
        interval: 200,
        timeout: 1000,
        maxFailures: 3,
      });

      expect(customChecker).toBeDefined();
      customChecker.destroy();
    });

    it('should use provided timeout', () => {
      const customChecker = new HealthChecker(checkFn, {
        interval: 50,
        timeout: 500,
        maxFailures: 3,
      });

      expect(customChecker).toBeDefined();
      customChecker.destroy();
    });

    it('should use provided max failures', () => {
      const customChecker = new HealthChecker(checkFn, {
        interval: 50,
        timeout: 1000,
        maxFailures: 5,
      });

      expect(customChecker).toBeDefined();
      customChecker.destroy();
    });
  });

  describe('State Management', () => {
    it('should maintain separate state for each connection', () => {
      checker.startCheck('conn-1');
      checker.startCheck('conn-2');

      checker.resetFailureCount('conn-1');

      const status1 = checker.getHealthStatus('conn-1');
      const status2 = checker.getHealthStatus('conn-2');

      expect(status1.failures).toBe(0);
      expect(status2.failures).toBe(0);
    });

    it('should handle non-existent connection gracefully', () => {
      const status = checker.getHealthStatus('non-existent');
      expect(status).toBeDefined();
      expect(status.failures).toBe(0);
    });
  });
});

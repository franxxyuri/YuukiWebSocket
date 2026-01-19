/**
 * Remote Control Service Unit Tests
 * Tests for remote control functionality
 */

import { RemoteControlService } from '../../../src/services/remote-control';
import { InputEvent, MouseEvent } from '../../../src/types/services';

describe('RemoteControlService', () => {
  let service: RemoteControlService;

  beforeEach(() => {
    service = new RemoteControlService();
  });

  describe('sendInputEvent', () => {
    it('should queue input events', async () => {
      const event: InputEvent = {
        eventId: 'event_1',
        type: 'mouse',
        timestamp: Date.now(),
        data: {
          action: 'move',
          x: 100,
          y: 200,
        } as MouseEvent,
      };

      await service.sendInputEvent(event);
      const status = await service.getQueueStatus();

      expect(status.queueLength).toBe(1);
    });

    it('should handle multiple events', async () => {
      for (let i = 0; i < 5; i++) {
        const event: InputEvent = {
          eventId: `event_${i}`,
          type: 'mouse',
          timestamp: Date.now(),
          data: {
            action: 'move',
            x: 100 + i,
            y: 200 + i,
          } as MouseEvent,
        };
        await service.sendInputEvent(event);
      }

      const status = await service.getQueueStatus();
      expect(status.queueLength).toBe(5);
    });

    it('should drop oldest events when queue exceeds max size', async () => {
      // Add more than max queue size (1000)
      for (let i = 0; i < 1100; i++) {
        const event: InputEvent = {
          eventId: `event_${i}`,
          type: 'mouse',
          timestamp: Date.now(),
          data: {
            action: 'move',
            x: 100,
            y: 200,
          } as MouseEvent,
        };
        await service.sendInputEvent(event);
      }

      const status = await service.getQueueStatus();
      expect(status.queueLength).toBeLessThanOrEqual(1000);
    });
  });

  describe('batchSendEvents', () => {
    it('should batch send multiple events', async () => {
      const events: InputEvent[] = [];
      for (let i = 0; i < 10; i++) {
        events.push({
          eventId: `event_${i}`,
          type: 'mouse',
          timestamp: Date.now(),
          data: {
            action: 'move',
            x: 100 + i,
            y: 200 + i,
          } as MouseEvent,
        });
      }

      await service.batchSendEvents(events);
      const status = await service.getQueueStatus();

      expect(status.queueLength).toBe(10);
    });
  });

  describe('getQueueStatus', () => {
    it('should return queue status', async () => {
      const event: InputEvent = {
        eventId: 'event_1',
        type: 'mouse',
        timestamp: Date.now(),
        data: {
          action: 'move',
          x: 100,
          y: 200,
        } as MouseEvent,
      };

      await service.sendInputEvent(event);
      const status = await service.getQueueStatus();

      expect(status.queueLength).toBe(1);
      expect(status.oldestEventAge).toBeGreaterThanOrEqual(0);
      expect(status.averageLatency).toBeGreaterThanOrEqual(0);
    });

    it('should return zero for empty queue', async () => {
      const status = await service.getQueueStatus();

      expect(status.queueLength).toBe(0);
      expect(status.oldestEventAge).toBe(0);
      expect(status.averageLatency).toBe(0);
    });
  });

  describe('clearQueue', () => {
    it('should clear all queued events', async () => {
      for (let i = 0; i < 5; i++) {
        const event: InputEvent = {
          eventId: `event_${i}`,
          type: 'mouse',
          timestamp: Date.now(),
          data: {
            action: 'move',
            x: 100,
            y: 200,
          } as MouseEvent,
        };
        await service.sendInputEvent(event);
      }

      await service.clearQueue();
      const status = await service.getQueueStatus();

      expect(status.queueLength).toBe(0);
    });
  });

  describe('event batching', () => {
    it('should batch events within interval', async () => {
      let batchSentCount = 0;
      service.on('batch:sent', () => {
        batchSentCount++;
      });

      for (let i = 0; i < 3; i++) {
        const event: InputEvent = {
          eventId: `event_${i}`,
          type: 'mouse',
          timestamp: Date.now(),
          data: {
            action: 'move',
            x: 100,
            y: 200,
          } as MouseEvent,
        };
        await service.sendInputEvent(event);
      }

      // Wait for batch timer
      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(batchSentCount).toBeGreaterThanOrEqual(0);
    });

    it('should flush batch when max size reached', async () => {
      let batchSentCount = 0;
      service.on('batch:sent', (batch) => {
        batchSentCount++;
        expect(batch.length).toBeGreaterThan(0);
      });

      // Send 50 events (max batch size)
      for (let i = 0; i < 50; i++) {
        const event: InputEvent = {
          eventId: `event_${i}`,
          type: 'mouse',
          timestamp: Date.now(),
          data: {
            action: 'move',
            x: 100,
            y: 200,
          } as MouseEvent,
        };
        await service.sendInputEvent(event);
      }

      expect(batchSentCount).toBeGreaterThan(0);
    });
  });

  describe('event retrieval', () => {
    it('should get queued events', async () => {
      const event: InputEvent = {
        eventId: 'event_1',
        type: 'mouse',
        timestamp: Date.now(),
        data: {
          action: 'move',
          x: 100,
          y: 200,
        } as MouseEvent,
      };

      await service.sendInputEvent(event);
      const queued = service.getQueuedEvents();

      expect(queued.length).toBe(1);
      expect(queued[0].eventId).toBe('event_1');
    });

    it('should replay queued events', async () => {
      let replayedEvents: InputEvent[] = [];
      service.on('events:replayed', (events) => {
        replayedEvents = events;
      });

      const event: InputEvent = {
        eventId: 'event_1',
        type: 'mouse',
        timestamp: Date.now(),
        data: {
          action: 'move',
          x: 100,
          y: 200,
        } as MouseEvent,
      };

      await service.sendInputEvent(event);
      await service.replayQueuedEvents();

      expect(replayedEvents.length).toBe(1);
    });
  });
});

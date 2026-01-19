/**
 * Remote Control Service
 * Handles input events (mouse, keyboard, touch) with low latency and reliable delivery
 */

import { EventEmitter } from 'events';
import {
  InputEvent,
  MouseEvent,
  KeyboardEvent,
  TouchEvent,
  GestureEvent,
  RemoteControlService as IRemoteControlService,
  QueueStatus,
} from '../../types/services';

export class RemoteControlService extends EventEmitter implements IRemoteControlService {
  private eventQueue: InputEvent[] = [];
  private readonly maxQueueSize: number = 1000;
  private readonly batchInterval: number = 10; // milliseconds
  private readonly maxBatchSize: number = 50;
  private batchTimer: NodeJS.Timeout | null = null;
  private pendingBatch: InputEvent[] = [];

  constructor() {
    super();
  }

  /**
   * Send a single input event
   */
  async sendInputEvent(event: InputEvent): Promise<void> {
    if (this.eventQueue.length >= this.maxQueueSize) {
      // Drop oldest event
      this.eventQueue.shift();
      this.emit('event:dropped');
    }

    this.eventQueue.push(event);
    this.pendingBatch.push(event);

    // Check if we should flush the batch
    if (this.pendingBatch.length >= this.maxBatchSize) {
      this.flushBatch();
    } else if (!this.batchTimer) {
      // Start batch timer
      this.batchTimer = setTimeout(() => this.flushBatch(), this.batchInterval);
    }

    this.emit('event:queued', event);
  }

  /**
   * Batch send multiple events
   */
  async batchSendEvents(events: InputEvent[]): Promise<void> {
    for (const event of events) {
      await this.sendInputEvent(event);
    }
  }

  /**
   * Get input queue status
   */
  async getQueueStatus(): Promise<QueueStatus> {
    const oldestEvent = this.eventQueue.length > 0 ? this.eventQueue[0] : null;
    const oldestEventAge = oldestEvent ? Date.now() - oldestEvent.timestamp : 0;

    // Calculate average latency (simplified)
    const averageLatency = this.eventQueue.length > 0 ? oldestEventAge / this.eventQueue.length : 0;

    return {
      queueLength: this.eventQueue.length,
      oldestEventAge,
      averageLatency,
    };
  }

  /**
   * Clear input queue
   */
  async clearQueue(): Promise<void> {
    this.eventQueue = [];
    this.pendingBatch = [];
    if (this.batchTimer) {
      clearTimeout(this.batchTimer);
      this.batchTimer = null;
    }
    this.emit('queue:cleared');
  }

  /**
   * Flush pending batch
   */
  private flushBatch(): void {
    if (this.batchTimer) {
      clearTimeout(this.batchTimer);
      this.batchTimer = null;
    }

    if (this.pendingBatch.length > 0) {
      this.emit('batch:sent', this.pendingBatch);
      this.pendingBatch = [];
    }
  }

  /**
   * Get all queued events
   */
  getQueuedEvents(): InputEvent[] {
    return [...this.eventQueue];
  }

  /**
   * Replay queued events (for reconnection)
   */
  async replayQueuedEvents(): Promise<void> {
    const events = [...this.eventQueue];
    this.emit('events:replayed', events);
  }
}

export default RemoteControlService;

/**
 * Screen Mirror Service
 * Captures, compresses, and streams screen content in real-time with adaptive quality
 */

import { EventEmitter } from 'events';
import { ScreenFrame, ScreenMirrorService as IScreenMirrorService, MirrorOptions } from '../../types/services';

export class ScreenMirrorService extends EventEmitter implements IScreenMirrorService {
  private isActive: boolean = false;
  private frameQueue: ScreenFrame[] = [];
  private readonly maxQueueSize: number = 10;
  private currentOptions: MirrorOptions = {
    frameRate: 30,
    resolution: '1080p',
    codec: 'h264',
    quality: 80,
  };

  constructor() {
    super();
  }

  /**
   * Start screen mirroring
   */
  async startMirroring(options: Partial<MirrorOptions> = {}): Promise<void> {
    this.currentOptions = { ...this.currentOptions, ...options };
    this.isActive = true;
    this.frameQueue = [];
    this.emit('mirroring:started', this.currentOptions);
  }

  /**
   * Stop screen mirroring
   */
  async stopMirroring(): Promise<void> {
    this.isActive = false;
    this.frameQueue = [];
    this.emit('mirroring:stopped');
  }

  /**
   * Get current frame
   */
  async getCurrentFrame(): Promise<ScreenFrame> {
    if (this.frameQueue.length === 0) {
      throw new Error('No frames available');
    }
    return this.frameQueue[this.frameQueue.length - 1];
  }

  /**
   * Add frame to queue
   */
  addFrame(frame: ScreenFrame): void {
    if (!this.isActive) {
      return;
    }

    // Drop oldest frames if queue exceeds max size
    if (this.frameQueue.length >= this.maxQueueSize) {
      this.frameQueue.shift();
      this.emit('frame:dropped');
    }

    this.frameQueue.push(frame);
    this.emit('frame:added', frame);
  }

  /**
   * Adjust quality based on network bandwidth
   */
  async adjustQuality(bandwidth: number): Promise<void> {
    // bandwidth in Mbps
    if (bandwidth < 5) {
      this.currentOptions.quality = 40;
      this.currentOptions.frameRate = 15;
      this.currentOptions.resolution = '720p';
    } else if (bandwidth < 10) {
      this.currentOptions.quality = 60;
      this.currentOptions.frameRate = 20;
      this.currentOptions.resolution = '720p';
    } else if (bandwidth < 20) {
      this.currentOptions.quality = 80;
      this.currentOptions.frameRate = 30;
      this.currentOptions.resolution = '1080p';
    } else {
      this.currentOptions.quality = 95;
      this.currentOptions.frameRate = 30;
      this.currentOptions.resolution = '1440p';
    }

    this.emit('quality:adjusted', this.currentOptions);
  }

  /**
   * Handle orientation change
   */
  async handleOrientationChange(orientation: 'portrait' | 'landscape'): Promise<void> {
    this.emit('orientation:changed', orientation);
  }

  /**
   * Get current options
   */
  getOptions(): MirrorOptions {
    return { ...this.currentOptions };
  }

  /**
   * Get frame queue size
   */
  getQueueSize(): number {
    return this.frameQueue.length;
  }

  /**
   * Check if mirroring is active
   */
  isRunning(): boolean {
    return this.isActive;
  }
}

export default ScreenMirrorService;

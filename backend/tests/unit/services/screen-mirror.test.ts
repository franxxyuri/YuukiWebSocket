/**
 * Screen Mirror Service Unit Tests
 * Tests for screen mirroring functionality
 */

import { ScreenMirrorService } from '../../../src/services/screen-mirror';
import { ScreenFrame } from '../../../src/types/services';

describe('ScreenMirrorService', () => {
  let service: ScreenMirrorService;

  beforeEach(() => {
    service = new ScreenMirrorService();
  });

  describe('startMirroring', () => {
    it('should start mirroring with default options', async () => {
      await service.startMirroring();

      expect(service.isRunning()).toBe(true);
      const options = service.getOptions();
      expect(options.frameRate).toBe(30);
      expect(options.resolution).toBe('1080p');
    });

    it('should start mirroring with custom options', async () => {
      await service.startMirroring({
        frameRate: 60,
        resolution: '720p',
        quality: 50,
      });

      const options = service.getOptions();
      expect(options.frameRate).toBe(60);
      expect(options.resolution).toBe('720p');
      expect(options.quality).toBe(50);
    });
  });

  describe('stopMirroring', () => {
    it('should stop mirroring', async () => {
      await service.startMirroring();
      await service.stopMirroring();

      expect(service.isRunning()).toBe(false);
    });
  });

  describe('frame management', () => {
    beforeEach(async () => {
      await service.startMirroring();
    });

    it('should add frames to queue', () => {
      const frame: ScreenFrame = {
        frameId: 'frame_1',
        timestamp: Date.now(),
        width: 1920,
        height: 1080,
        orientation: 'landscape',
        data: Buffer.from('test'),
        codec: 'h264',
        quality: 80,
        size: 1024,
      };

      service.addFrame(frame);
      expect(service.getQueueSize()).toBe(1);
    });

    it('should drop oldest frames when queue exceeds max size', () => {
      for (let i = 0; i < 15; i++) {
        const frame: ScreenFrame = {
          frameId: `frame_${i}`,
          timestamp: Date.now() + i,
          width: 1920,
          height: 1080,
          orientation: 'landscape',
          data: Buffer.from(`test_${i}`),
          codec: 'h264',
          quality: 80,
          size: 1024,
        };
        service.addFrame(frame);
      }

      // Queue should not exceed max size (10)
      expect(service.getQueueSize()).toBeLessThanOrEqual(10);
    });

    it('should get current frame', async () => {
      const frame: ScreenFrame = {
        frameId: 'frame_1',
        timestamp: Date.now(),
        width: 1920,
        height: 1080,
        orientation: 'landscape',
        data: Buffer.from('test'),
        codec: 'h264',
        quality: 80,
        size: 1024,
      };

      service.addFrame(frame);
      const current = await service.getCurrentFrame();

      expect(current.frameId).toBe('frame_1');
    });
  });

  describe('quality adjustment', () => {
    beforeEach(async () => {
      await service.startMirroring();
    });

    it('should reduce quality for low bandwidth', async () => {
      await service.adjustQuality(3); // 3 Mbps

      const options = service.getOptions();
      expect(options.quality).toBe(40);
      expect(options.frameRate).toBe(15);
    });

    it('should maintain quality for high bandwidth', async () => {
      await service.adjustQuality(50); // 50 Mbps

      const options = service.getOptions();
      expect(options.quality).toBe(95);
      expect(options.frameRate).toBe(30);
    });

    it('should adjust resolution based on bandwidth', async () => {
      await service.adjustQuality(5); // 5 Mbps
      let options = service.getOptions();
      expect(options.resolution).toBe('720p');

      await service.adjustQuality(30); // 30 Mbps
      options = service.getOptions();
      expect(options.resolution).toBe('1440p');
    });
  });

  describe('orientation handling', () => {
    it('should handle orientation change', async () => {
      await service.startMirroring();
      await service.handleOrientationChange('portrait');

      // Should not throw
      expect(service.isRunning()).toBe(true);
    });
  });

  describe('event emission', () => {
    it('should emit mirroring:started event', (done) => {
      service.on('mirroring:started', (options) => {
        expect(options.frameRate).toBe(30);
        done();
      });

      service.startMirroring();
    });

    it('should emit mirroring:stopped event', (done) => {
      service.on('mirroring:stopped', () => {
        done();
      });

      service.startMirroring().then(() => service.stopMirroring());
    });

    it('should emit frame:added event', (done) => {
      service.on('frame:added', (frame) => {
        expect(frame.frameId).toBe('frame_1');
        done();
      });

      service.startMirroring().then(() => {
        const frame: ScreenFrame = {
          frameId: 'frame_1',
          timestamp: Date.now(),
          width: 1920,
          height: 1080,
          orientation: 'landscape',
          data: Buffer.from('test'),
          codec: 'h264',
          quality: 80,
          size: 1024,
        };
        service.addFrame(frame);
      });
    });
  });
});

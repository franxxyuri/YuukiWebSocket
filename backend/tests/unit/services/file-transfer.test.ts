/**
 * File Transfer Service Unit Tests
 * Tests for file transfer functionality
 */

import { FileTransferService } from '../../../src/services/file-transfer';
import { FileTransferManager } from '../../../src/utils/file-transfer-manager';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

describe('FileTransferService', () => {
  let service: FileTransferService;
  let tempDir: string;

  beforeEach(() => {
    // Create temporary directory for test files
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'file-transfer-test-'));
    service = new FileTransferService({
      stateDbPath: path.join(tempDir, 'states'),
    });
  });

  afterEach(() => {
    service.destroy();
    // Clean up temporary directory
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  describe('initiateTransfer', () => {
    it('should create a new transfer session with unique session ID', async () => {
      const session = await service.initiateTransfer(
        'test.txt',
        path.join(tempDir, 'test.txt'),
        1024,
        'upload'
      );

      expect(session).toBeDefined();
      expect(session.sessionId).toBeDefined();
      expect(session.sessionId).toMatch(/^transfer_\d+_[a-z0-9]+$/);
      expect(session.fileName).toBe('test.txt');
      expect(session.totalSize).toBe(1024);
      expect(session.status).toBe('pending');
      expect(session.chunksCompleted).toBe(0);
      expect(session.chunkSize).toBe(64 * 1024);
    });

    it('should generate unique session IDs for concurrent transfers', async () => {
      const session1 = await service.initiateTransfer(
        'file1.txt',
        path.join(tempDir, 'file1.txt'),
        1024,
        'upload'
      );

      const session2 = await service.initiateTransfer(
        'file2.txt',
        path.join(tempDir, 'file2.txt'),
        2048,
        'upload'
      );

      expect(session1.sessionId).not.toBe(session2.sessionId);
      expect(session1.fileName).toBe('file1.txt');
      expect(session2.fileName).toBe('file2.txt');
    });

    it('should handle large files up to 10GB', async () => {
      const largeFileSize = 10 * 1024 * 1024 * 1024; // 10GB
      const session = await service.initiateTransfer(
        'large.bin',
        path.join(tempDir, 'large.bin'),
        largeFileSize,
        'upload'
      );

      expect(session.totalSize).toBe(largeFileSize);
      expect(session.status).toBe('pending');
    });

    it('should emit transfer:initiated event', async () => {
      const eventSpy = jest.fn();
      service.on('transfer:initiated', eventSpy);

      const session = await service.initiateTransfer(
        'test.txt',
        path.join(tempDir, 'test.txt'),
        1024,
        'upload'
      );

      expect(eventSpy).toHaveBeenCalledWith(expect.objectContaining({
        sessionId: session.sessionId,
        fileName: 'test.txt',
      }));
    });
  });

  describe('resumeTransfer', () => {
    it('should resume a paused transfer', async () => {
      const session = await service.initiateTransfer(
        'test.txt',
        path.join(tempDir, 'test.txt'),
        1024,
        'upload'
      );

      // Create the file so it exists
      fs.writeFileSync(session.filePath, Buffer.alloc(1024));

      await service.resumeTransfer(session.sessionId);
      const resumed = service.getSession(session.sessionId);

      expect(resumed?.status).toBe('in_progress');
    });

    it('should throw error for non-existent session', async () => {
      await expect(service.resumeTransfer('invalid_id')).rejects.toThrow(
        'Transfer session invalid_id not found'
      );
    });

    it('should throw error if file does not exist', async () => {
      const session = await service.initiateTransfer(
        'nonexistent.txt',
        path.join(tempDir, 'nonexistent.txt'),
        1024,
        'upload'
      );

      await expect(service.resumeTransfer(session.sessionId)).rejects.toThrow(
        'File not found'
      );
    });

    it('should emit transfer:resumed event', async () => {
      const eventSpy = jest.fn();
      service.on('transfer:resumed', eventSpy);

      const session = await service.initiateTransfer(
        'test.txt',
        path.join(tempDir, 'test.txt'),
        1024,
        'upload'
      );

      fs.writeFileSync(session.filePath, Buffer.alloc(1024));
      await service.resumeTransfer(session.sessionId);

      expect(eventSpy).toHaveBeenCalledWith(expect.objectContaining({
        sessionId: session.sessionId,
        status: 'in_progress',
      }));
    });
  });

  describe('cancelTransfer', () => {
    it('should cancel an active transfer', async () => {
      const session = await service.initiateTransfer(
        'test.txt',
        path.join(tempDir, 'test.txt'),
        1024,
        'upload'
      );

      await service.cancelTransfer(session.sessionId);
      const cancelled = service.getSession(session.sessionId);

      expect(cancelled?.status).toBe('failed');
    });

    it('should clean up partial files on cancel', async () => {
      const session = await service.initiateTransfer(
        'test.txt',
        path.join(tempDir, 'test.txt'),
        1024,
        'upload'
      );

      // Create partial file
      fs.writeFileSync(session.filePath, Buffer.alloc(512));
      expect(fs.existsSync(session.filePath)).toBe(true);

      await service.cancelTransfer(session.sessionId);

      expect(fs.existsSync(session.filePath)).toBe(false);
    });

    it('should emit transfer:cancelled event', async () => {
      const eventSpy = jest.fn();
      service.on('transfer:cancelled', eventSpy);

      const session = await service.initiateTransfer(
        'test.txt',
        path.join(tempDir, 'test.txt'),
        1024,
        'upload'
      );

      await service.cancelTransfer(session.sessionId);

      expect(eventSpy).toHaveBeenCalledWith(expect.objectContaining({
        sessionId: session.sessionId,
        status: 'failed',
      }));
    });
  });

  describe('getProgress', () => {
    it('should return progress information', async () => {
      const session = await service.initiateTransfer(
        'test.txt',
        path.join(tempDir, 'test.txt'),
        1024,
        'upload'
      );

      const progress = await service.getProgress(session.sessionId);

      expect(progress.sessionId).toBe(session.sessionId);
      expect(progress.percentage).toBe(0);
      expect(progress.bytesTransferred).toBe(0);
      expect(progress.totalBytes).toBe(1024);
      expect(progress.speed).toBe(0);
    });

    it('should calculate correct percentage', async () => {
      const session = await service.initiateTransfer(
        'test.txt',
        path.join(tempDir, 'test.txt'),
        1024,
        'upload'
      );

      // Simulate progress by marking chunks as completed
      service.markChunkCompleted(session.sessionId, 0);

      const progress = await service.getProgress(session.sessionId);
      expect(progress.percentage).toBeGreaterThan(0);
      expect(progress.bytesTransferred).toBeGreaterThan(0);
    });

    it('should throw error for non-existent session', async () => {
      await expect(service.getProgress('invalid_id')).rejects.toThrow(
        'Transfer session invalid_id not found'
      );
    });
  });

  describe('verifyIntegrity', () => {
    it('should verify file integrity with matching checksum', async () => {
      const testData = Buffer.from('test data');
      const testFile = path.join(tempDir, 'test.txt');
      fs.writeFileSync(testFile, testData);

      const session = await service.initiateTransfer(
        'test.txt',
        testFile,
        testData.length,
        'upload'
      );

      // Calculate and set checksum
      const checksum = await service['manager'].calculateFileChecksum(testFile);
      service.setChecksum(session.sessionId, checksum);

      const isValid = await service.verifyIntegrity(session.sessionId);
      expect(isValid).toBe(true);
    });

    it('should detect checksum mismatch', async () => {
      const testData = Buffer.from('test data');
      const testFile = path.join(tempDir, 'test.txt');
      fs.writeFileSync(testFile, testData);

      const session = await service.initiateTransfer(
        'test.txt',
        testFile,
        testData.length,
        'upload'
      );

      // Set wrong checksum
      service.setChecksum(session.sessionId, 'wrong_checksum');

      const isValid = await service.verifyIntegrity(session.sessionId);
      expect(isValid).toBe(false);
    });

    it('should throw error if no checksum is set', async () => {
      const testFile = path.join(tempDir, 'test.txt');
      fs.writeFileSync(testFile, Buffer.from('test data'));

      const session = await service.initiateTransfer(
        'test.txt',
        testFile,
        10,
        'upload'
      );

      await expect(service.verifyIntegrity(session.sessionId)).rejects.toThrow(
        'No checksum available'
      );
    });
  });

  describe('chunk management', () => {
    it('should mark chunk as completed', async () => {
      const session = await service.initiateTransfer(
        'test.txt',
        path.join(tempDir, 'test.txt'),
        1024,
        'upload'
      );

      const result = service.markChunkCompleted(session.sessionId, 0);
      expect(result).toBe(true);

      const updated = service.getSession(session.sessionId);
      expect(updated?.chunksCompleted).toBe(1);
    });

    it('should get pending chunks', async () => {
      const session = await service.initiateTransfer(
        'test.txt',
        path.join(tempDir, 'test.txt'),
        1024 * 1024, // 1MB = 16 chunks of 64KB
        'upload'
      );

      const pending = service.getPendingChunks(session.sessionId);
      expect(pending.length).toBe(16);

      // Mark some chunks as completed
      service.markChunkCompleted(session.sessionId, 0);
      service.markChunkCompleted(session.sessionId, 1);

      const remainingPending = service.getPendingChunks(session.sessionId);
      expect(remainingPending.length).toBe(14);
      expect(remainingPending).not.toContain(0);
      expect(remainingPending).not.toContain(1);
    });

    it('should get chunk info', async () => {
      const session = await service.initiateTransfer(
        'test.txt',
        path.join(tempDir, 'test.txt'),
        1024,
        'upload'
      );

      const chunkInfo = service.getChunkInfo(session.sessionId, 0);
      expect(chunkInfo).toBeDefined();
      expect(chunkInfo?.chunkIndex).toBe(0);
      expect(chunkInfo?.offset).toBe(0);
      expect(chunkInfo?.size).toBe(1024); // File is smaller than chunk size
    });
  });

  describe('file operations', () => {
    it('should read chunk from file', async () => {
      const testData = Buffer.from('Hello, World!');
      const testFile = path.join(tempDir, 'test.txt');
      fs.writeFileSync(testFile, testData);

      const session = await service.initiateTransfer(
        'test.txt',
        testFile,
        testData.length,
        'upload'
      );

      const chunk = await service.readChunk(session.sessionId, 0);
      expect(chunk).toEqual(testData);
    });

    it('should write chunk to file', async () => {
      const testFile = path.join(tempDir, 'test.txt');
      const session = await service.initiateTransfer(
        'test.txt',
        testFile,
        1024,
        'download'
      );

      const testData = Buffer.from('Hello, World!');
      await service.writeChunk(session.sessionId, 0, testData);

      const written = fs.readFileSync(testFile);
      expect(written).toEqual(testData);
    });
  });

  describe('session management', () => {
    it('should retrieve session by ID', async () => {
      const session = await service.initiateTransfer(
        'test.txt',
        path.join(tempDir, 'test.txt'),
        1024,
        'upload'
      );

      const retrieved = service.getSession(session.sessionId);
      expect(retrieved).toEqual(session);
    });

    it('should get all active sessions', async () => {
      await service.initiateTransfer('file1.txt', path.join(tempDir, 'file1.txt'), 1024, 'upload');
      await service.initiateTransfer('file2.txt', path.join(tempDir, 'file2.txt'), 2048, 'upload');

      const sessions = service.getAllSessions();
      expect(sessions.length).toBe(2);
    });

    it('should delete session', async () => {
      const session = await service.initiateTransfer(
        'test.txt',
        path.join(tempDir, 'test.txt'),
        1024,
        'upload'
      );

      const deleted = service.deleteSession(session.sessionId);
      expect(deleted).toBe(true);

      const retrieved = service.getSession(session.sessionId);
      expect(retrieved).toBeUndefined();
    });
  });

  describe('concurrent transfer management', () => {
    it('should track active transfer count', async () => {
      const session1 = await service.initiateTransfer(
        'file1.txt',
        path.join(tempDir, 'file1.txt'),
        1024,
        'upload'
      );

      fs.writeFileSync(session1.filePath, Buffer.alloc(1024));
      await service.resumeTransfer(session1.sessionId);

      expect(service.getActiveTransferCount()).toBe(1);

      const session2 = await service.initiateTransfer(
        'file2.txt',
        path.join(tempDir, 'file2.txt'),
        1024,
        'upload'
      );

      fs.writeFileSync(session2.filePath, Buffer.alloc(1024));
      await service.resumeTransfer(session2.sessionId);

      expect(service.getActiveTransferCount()).toBe(2);
    });
  });
});

describe('FileTransferManager', () => {
  let manager: FileTransferManager;
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'file-transfer-manager-test-'));
    manager = new FileTransferManager({
      stateDbPath: path.join(tempDir, 'states'),
    });
  });

  afterEach(() => {
    manager.destroy();
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  describe('checksum calculation', () => {
    it('should calculate SHA-256 checksum for file', async () => {
      const testData = Buffer.from('test data');
      const testFile = path.join(tempDir, 'test.txt');
      fs.writeFileSync(testFile, testData);

      const checksum = await manager.calculateFileChecksum(testFile);
      expect(checksum).toBeDefined();
      expect(checksum).toMatch(/^[a-f0-9]{64}$/); // SHA-256 is 64 hex characters
    });

    it('should calculate checksum for buffer', () => {
      const testData = Buffer.from('test data');
      const checksum = manager.calculateBufferChecksum(testData);

      expect(checksum).toBeDefined();
      expect(checksum).toMatch(/^[a-f0-9]{64}$/);
    });

    it('should calculate checksum for file chunk', async () => {
      const testData = Buffer.from('Hello, World!');
      const testFile = path.join(tempDir, 'test.txt');
      fs.writeFileSync(testFile, testData);

      const checksum = await manager.calculateChunkChecksum(testFile, 0, testData.length);
      expect(checksum).toBeDefined();
      expect(checksum).toMatch(/^[a-f0-9]{64}$/);
    });

    it('should produce consistent checksums', async () => {
      const testData = Buffer.from('test data');
      const testFile = path.join(tempDir, 'test.txt');
      fs.writeFileSync(testFile, testData);

      const checksum1 = await manager.calculateFileChecksum(testFile);
      const checksum2 = await manager.calculateFileChecksum(testFile);

      expect(checksum1).toBe(checksum2);
    });
  });

  describe('state persistence', () => {
    it('should persist and load transfer state', async () => {
      const sessionId = 'test-session-1';
      const state = manager.createSession(sessionId, 'test.txt', '/path/to/test.txt', 1024);

      expect(state.sessionId).toBe(sessionId);

      // Create new manager to test loading
      const manager2 = new FileTransferManager({
        stateDbPath: path.join(tempDir, 'states'),
      });

      const loaded = manager2.getSession(sessionId);
      expect(loaded).toBeDefined();
      expect(loaded?.fileName).toBe('test.txt');

      manager2.destroy();
    });

    it('should persist chunk completion', async () => {
      const sessionId = 'test-session-2';
      manager.createSession(sessionId, 'test.txt', '/path/to/test.txt', 1024);

      manager.markChunkCompleted(sessionId, 0);
      manager.markChunkCompleted(sessionId, 1);

      // Create new manager to test loading
      const manager2 = new FileTransferManager({
        stateDbPath: path.join(tempDir, 'states'),
      });

      const loaded = manager2.getSession(sessionId);
      expect(loaded?.chunksCompleted).toContain(0);
      expect(loaded?.chunksCompleted).toContain(1);

      manager2.destroy();
    });
  });

  describe('large file support', () => {
    it('should handle 10GB file size without loading into memory', async () => {
      const largeFileSize = 10 * 1024 * 1024 * 1024; // 10GB
      const sessionId = 'large-file-session';

      const state = manager.createSession(
        sessionId,
        'large.bin',
        '/path/to/large.bin',
        largeFileSize
      );

      expect(state.totalSize).toBe(largeFileSize);

      const totalChunks = Math.ceil(largeFileSize / manager['chunkSize']);
      expect(totalChunks).toBe(Math.ceil(10 * 1024 * 1024 * 1024 / (64 * 1024)));
    });
  });
});

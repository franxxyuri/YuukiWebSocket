/**
 * File Transfer Service Unit Tests
 * Tests for file transfer functionality
 */

import { FileTransferService } from '../../../src/services/file-transfer';
import { FileTransferManager } from '../../../src/utils/file-transfer-manager';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import * as fc from 'fast-check';

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


/**
 * Property-Based Tests for File Transfer Service
 * Feature: windows-android-connect-optimization
 * Property 1: File Transfer Session Uniqueness
 * Validates: Requirements 1.1
 */
describe('FileTransferService - Property Tests', () => {
  let service: FileTransferService;
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'file-transfer-pbt-'));
    service = new FileTransferService({
      stateDbPath: path.join(tempDir, 'states'),
    });
  });

  afterEach(() => {
    service.destroy();
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  describe('Property 1: File Transfer Session Uniqueness', () => {
    it('should generate unique session IDs for any number of concurrent transfers', async () => {
      // Property: For any number of concurrent file uploads (1-100), each transfer session
      // SHALL receive a unique session ID that is not reused for other concurrent transfers.
      // Validates: Requirements 1.1

      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 1, max: 100 }),
          async (numTransfers) => {
            const sessions = [];

            // Initiate multiple concurrent transfers
            for (let i = 0; i < numTransfers; i++) {
              const session = await service.initiateTransfer(
                `file_${i}.txt`,
                path.join(tempDir, `file_${i}.txt`),
                1024 * (i + 1), // Vary file sizes
                'upload'
              );
              sessions.push(session);
            }

            // Verify all session IDs are unique
            const sessionIds = sessions.map((s) => s.sessionId);
            const uniqueIds = new Set(sessionIds);

            expect(uniqueIds.size).toBe(sessionIds.length);
            expect(uniqueIds.size).toBe(numTransfers);

            // Verify no session ID is reused
            for (let i = 0; i < sessionIds.length; i++) {
              for (let j = i + 1; j < sessionIds.length; j++) {
                expect(sessionIds[i]).not.toBe(sessionIds[j]);
              }
            }

            // Verify all sessions are retrievable
            for (const session of sessions) {
              const retrieved = service.getSession(session.sessionId);
              expect(retrieved).toBeDefined();
              expect(retrieved?.sessionId).toBe(session.sessionId);
            }
          }
        ),
        { numRuns: 50 }
      );
    });

    it('should maintain session uniqueness across rapid sequential transfers', async () => {
      // Property: For any sequence of rapid file transfer initiations,
      // each session SHALL have a unique ID even when initiated in quick succession.
      // Validates: Requirements 1.1

      await fc.assert(
        fc.asyncProperty(
          fc.array(
            fc.record({
              fileName: fc.string({ minLength: 1, maxLength: 50 }),
              fileSize: fc.integer({ min: 1024, max: 100 * 1024 * 1024 }),
            }),
            { minLength: 1, maxLength: 50 }
          ),
          async (transfers) => {
            const sessions = [];

            // Rapidly initiate transfers
            for (const transfer of transfers) {
              const session = await service.initiateTransfer(
                transfer.fileName,
                path.join(tempDir, transfer.fileName),
                transfer.fileSize,
                'upload'
              );
              sessions.push(session);
            }

            // Verify uniqueness
            const sessionIds = sessions.map((s) => s.sessionId);
            const uniqueIds = new Set(sessionIds);

            expect(uniqueIds.size).toBe(sessionIds.length);

            // Verify all sessions are distinct
            for (let i = 0; i < sessions.length; i++) {
              for (let j = i + 1; j < sessions.length; j++) {
                expect(sessions[i].sessionId).not.toBe(sessions[j].sessionId);
                expect(sessions[i].fileName).not.toBe(sessions[j].fileName);
              }
            }
          }
        ),
        { numRuns: 50 }
      );
    });

    it('should generate session IDs that follow expected format', async () => {
      // Property: For any file transfer initiation, the generated session ID
      // SHALL follow the format "transfer_<timestamp>_<random>" to ensure uniqueness.
      // Validates: Requirements 1.1

      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 1, max: 50 }),
          async (numTransfers) => {
            const sessions = [];

            for (let i = 0; i < numTransfers; i++) {
              const session = await service.initiateTransfer(
                `file_${i}.txt`,
                path.join(tempDir, `file_${i}.txt`),
                1024,
                'upload'
              );
              sessions.push(session);
            }

            // Verify format of all session IDs
            for (const session of sessions) {
              expect(session.sessionId).toMatch(/^transfer_\d+_[a-z0-9]+$/);

              // Verify session ID is not empty
              expect(session.sessionId.length).toBeGreaterThan(0);

              // Verify session ID contains timestamp component
              const parts = session.sessionId.split('_');
              expect(parts.length).toBe(3);
              expect(parts[0]).toBe('transfer');
              expect(/^\d+$/.test(parts[1])).toBe(true); // timestamp is numeric
              expect(/^[a-z0-9]+$/.test(parts[2])).toBe(true); // random part is alphanumeric
            }
          }
        ),
        { numRuns: 50 }
      );
    });

    it('should ensure session IDs remain unique even with time-based collisions', async () => {
      // Property: For any concurrent transfers initiated at the same millisecond,
      // the random component SHALL ensure uniqueness despite timestamp collision.
      // Validates: Requirements 1.1

      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 10, max: 100 }),
          async (numConcurrent) => {
            // Initiate all transfers concurrently to maximize timestamp collision risk
            const promises = [];
            for (let i = 0; i < numConcurrent; i++) {
              promises.push(
                service.initiateTransfer(
                  `concurrent_${i}.txt`,
                  path.join(tempDir, `concurrent_${i}.txt`),
                  1024,
                  'upload'
                )
              );
            }

            const sessions = await Promise.all(promises);

            // Verify all session IDs are unique despite potential timestamp collision
            const sessionIds = sessions.map((s) => s.sessionId);
            const uniqueIds = new Set(sessionIds);

            expect(uniqueIds.size).toBe(sessionIds.length);
            expect(uniqueIds.size).toBe(numConcurrent);

            // Verify no duplicates
            for (let i = 0; i < sessionIds.length; i++) {
              for (let j = i + 1; j < sessionIds.length; j++) {
                expect(sessionIds[i]).not.toBe(sessionIds[j]);
              }
            }
          }
        ),
        { numRuns: 50 }
      );
    });

    it('should maintain session uniqueness across different file sizes', async () => {
      // Property: For any combination of file sizes (1KB to 10GB),
      // each transfer session SHALL have a unique ID regardless of file size.
      // Validates: Requirements 1.1

      await fc.assert(
        fc.asyncProperty(
          fc.array(
            fc.integer({ min: 1024, max: 10 * 1024 * 1024 * 1024 }),
            { minLength: 1, maxLength: 30 }
          ),
          async (fileSizes) => {
            const sessions = [];

            for (let i = 0; i < fileSizes.length; i++) {
              const session = await service.initiateTransfer(
                `file_${i}_${fileSizes[i]}.bin`,
                path.join(tempDir, `file_${i}_${fileSizes[i]}.bin`),
                fileSizes[i],
                'upload'
              );
              sessions.push(session);
            }

            // Verify uniqueness
            const sessionIds = sessions.map((s) => s.sessionId);
            const uniqueIds = new Set(sessionIds);

            expect(uniqueIds.size).toBe(sessionIds.length);

            // Verify file size doesn't affect uniqueness
            for (let i = 0; i < sessions.length; i++) {
              for (let j = i + 1; j < sessions.length; j++) {
                expect(sessions[i].sessionId).not.toBe(sessions[j].sessionId);
              }
            }
          }
        ),
        { numRuns: 50 }
      );
    });
  });
});


/**
 * Property 2: Transfer State Persistence
 * Validates: Requirements 1.2
 */
describe('Property 2: Transfer State Persistence', () => {
  let service: FileTransferService;
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'file-transfer-pbt-persistence-'));
    service = new FileTransferService({
      stateDbPath: path.join(tempDir, 'states'),
    });
  });

  afterEach(() => {
    service.destroy();
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('should persist transfer state with all required fields', async () => {
    // Property: For any interrupted file transfer, the persisted state SHALL contain
    // the file path, number of chunks completed, and total file size, enabling accurate resume.
    // Validates: Requirements 1.2

    await fc.assert(
      fc.asyncProperty(
        fc.record({
          fileName: fc.string({ minLength: 1, maxLength: 50 }),
          fileSize: fc.integer({ min: 1024, max: 100 * 1024 * 1024 }),
          chunksToComplete: fc.integer({ min: 0, max: 100 }),
        }),
        async (testData) => {
          const session = await service.initiateTransfer(
            testData.fileName,
            path.join(tempDir, testData.fileName),
            testData.fileSize,
            'upload'
          );

          // Simulate completing some chunks
          for (let i = 0; i < testData.chunksToComplete; i++) {
            service.markChunkCompleted(session.sessionId, i);
          }

          // Retrieve the session to verify state is persisted
          const retrieved = service.getSession(session.sessionId);

          expect(retrieved).toBeDefined();
          expect(retrieved?.sessionId).toBe(session.sessionId);
          expect(retrieved?.fileName).toBe(testData.fileName);
          expect(retrieved?.filePath).toBe(path.join(tempDir, testData.fileName));
          expect(retrieved?.totalSize).toBe(testData.fileSize);
          expect(retrieved?.chunksCompleted).toBe(testData.chunksToComplete);
          expect(retrieved?.chunkSize).toBe(64 * 1024);
        }
      ),
      { numRuns: 50 }
    );
  });

  it('should persist state across service restarts', async () => {
    // Property: For any transfer session created and modified, the state SHALL be
    // persable and recoverable even after service restart.
    // Validates: Requirements 1.2

    await fc.assert(
      fc.asyncProperty(
        fc.record({
          fileName: fc.string({ minLength: 1, maxLength: 50 }),
          fileSize: fc.integer({ min: 1024, max: 50 * 1024 * 1024 }),
          chunksToComplete: fc.integer({ min: 0, max: 50 }),
        }),
        async (testData) => {
          const stateDbPath = path.join(tempDir, 'states');

          // Create first service and transfer
          const service1 = new FileTransferService({ stateDbPath });
          const session = await service1.initiateTransfer(
            testData.fileName,
            path.join(tempDir, testData.fileName),
            testData.fileSize,
            'upload'
          );

          // Mark some chunks as completed
          for (let i = 0; i < testData.chunksToComplete; i++) {
            service1.markChunkCompleted(session.sessionId, i);
          }

          service1.destroy();

          // Create new service and verify state is recovered
          const service2 = new FileTransferService({ stateDbPath });
          const recovered = service2.getSession(session.sessionId);

          expect(recovered).toBeDefined();
          expect(recovered?.sessionId).toBe(session.sessionId);
          expect(recovered?.fileName).toBe(testData.fileName);
          expect(recovered?.totalSize).toBe(testData.fileSize);
          expect(recovered?.chunksCompleted).toBe(testData.chunksToComplete);

          service2.destroy();
        }
      ),
      { numRuns: 30 }
    );
  });

  it('should maintain state consistency during concurrent modifications', async () => {
    // Property: For any concurrent modifications to transfer state,
    // the persisted state SHALL remain consistent and accurate.
    // Validates: Requirements 1.2

    await fc.assert(
      fc.asyncProperty(
        fc.record({
          numTransfers: fc.integer({ min: 2, max: 10 }),
          chunksPerTransfer: fc.integer({ min: 5, max: 50 }),
        }),
        async (testData) => {
          const sessions = [];

          // Create multiple transfers
          for (let i = 0; i < testData.numTransfers; i++) {
            const session = await service.initiateTransfer(
              `file_${i}.bin`,
              path.join(tempDir, `file_${i}.bin`),
              testData.chunksPerTransfer * 64 * 1024,
              'upload'
            );
            sessions.push(session);
          }

          // Concurrently mark chunks as completed
          const promises = [];
          for (let i = 0; i < testData.numTransfers; i++) {
            for (let j = 0; j < testData.chunksPerTransfer; j++) {
              promises.push(
                Promise.resolve(service.markChunkCompleted(sessions[i].sessionId, j))
              );
            }
          }

          await Promise.all(promises);

          // Verify all states are consistent
          for (let i = 0; i < testData.numTransfers; i++) {
            const retrieved = service.getSession(sessions[i].sessionId);
            expect(retrieved?.chunksCompleted).toBe(testData.chunksPerTransfer);
          }
        }
      ),
      { numRuns: 30 }
    );
  });

  it('should preserve state for various file sizes', async () => {
    // Property: For any file size from 1KB to 10GB, the transfer state
    // SHALL be persisted with accurate size information.
    // Validates: Requirements 1.2

    await fc.assert(
      fc.asyncProperty(
        fc.array(
          fc.integer({ min: 1024, max: 10 * 1024 * 1024 * 1024 }),
          { minLength: 1, maxLength: 20 }
        ),
        async (fileSizes) => {
          const sessions = [];

          for (let i = 0; i < fileSizes.length; i++) {
            const session = await service.initiateTransfer(
              `file_${i}_${fileSizes[i]}.bin`,
              path.join(tempDir, `file_${i}_${fileSizes[i]}.bin`),
              fileSizes[i],
              'upload'
            );
            sessions.push(session);
          }

          // Verify all states are persisted with correct sizes
          for (let i = 0; i < sessions.length; i++) {
            const retrieved = service.getSession(sessions[i].sessionId);
            expect(retrieved?.totalSize).toBe(fileSizes[i]);
            expect(retrieved?.filePath).toContain(`file_${i}_${fileSizes[i]}.bin`);
          }
        }
      ),
      { numRuns: 30 }
    );
  });

  it('should preserve state with checksum information', async () => {
    // Property: For any transfer with checksum set, the persisted state
    // SHALL include the checksum for integrity verification.
    // Validates: Requirements 1.2

    await fc.assert(
      fc.asyncProperty(
        fc.array(
          fc.string({ minLength: 64, maxLength: 64 }),
          { minLength: 1, maxLength: 20 }
        ),
        async (checksums) => {
          const sessions = [];

          for (let i = 0; i < checksums.length; i++) {
            const session = await service.initiateTransfer(
              `file_${i}.bin`,
              path.join(tempDir, `file_${i}.bin`),
              1024 * 1024,
              'upload'
            );

            // Set checksum
            service.setChecksum(session.sessionId, checksums[i]);
            sessions.push(session);
          }

          // Verify checksums are persisted
          for (let i = 0; i < sessions.length; i++) {
            const retrieved = service.getSession(sessions[i].sessionId);
            expect(retrieved?.checksum).toBe(checksums[i]);
          }
        }
      ),
      { numRuns: 30 }
    );
  });
});


/**
 * Property 3: Resume Skips Completed Chunks
 * Validates: Requirements 1.3
 */
describe('Property 3: Resume Skips Completed Chunks', () => {
  let service: FileTransferService;
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'file-transfer-pbt-resume-'));
    service = new FileTransferService({
      stateDbPath: path.join(tempDir, 'states'),
    });
  });

  afterEach(() => {
    service.destroy();
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('should skip completed chunks when resuming transfer', async () => {
    // Property: For any resumed file transfer, the service SHALL not re-transfer
    // chunks that were already completed before interruption.
    // Validates: Requirements 1.3

    await fc.assert(
      fc.asyncProperty(
        fc.record({
          fileSize: fc.integer({ min: 64 * 1024, max: 10 * 1024 * 1024 }),
          chunksToComplete: fc.integer({ min: 1, max: 100 }),
        }),
        async (testData) => {
          const session = await service.initiateTransfer(
            'test.bin',
            path.join(tempDir, 'test.bin'),
            testData.fileSize,
            'upload'
          );

          // Calculate total chunks
          const totalChunks = Math.ceil(testData.fileSize / (64 * 1024));
          const chunksToMark = Math.min(testData.chunksToComplete, totalChunks);

          // Mark some chunks as completed
          for (let i = 0; i < chunksToMark; i++) {
            service.markChunkCompleted(session.sessionId, i);
          }

          // Get pending chunks before resume
          const pendingBefore = service.getPendingChunks(session.sessionId);

          // Verify completed chunks are not in pending list
          for (let i = 0; i < chunksToMark; i++) {
            expect(pendingBefore).not.toContain(i);
          }

          // Verify pending chunks count is correct
          expect(pendingBefore.length).toBe(totalChunks - chunksToMark);

          // Verify all pending chunks are after completed chunks
          for (const chunkIndex of pendingBefore) {
            expect(chunkIndex).toBeGreaterThanOrEqual(chunksToMark);
          }
        }
      ),
      { numRuns: 50 }
    );
  });

  it('should maintain completed chunks across multiple resume attempts', async () => {
    // Property: For any transfer resumed multiple times, previously completed
    // chunks SHALL remain marked as completed and not be re-transferred.
    // Validates: Requirements 1.3

    await fc.assert(
      fc.asyncProperty(
        fc.record({
          fileSize: fc.integer({ min: 64 * 1024, max: 5 * 1024 * 1024 }),
          resumeAttempts: fc.integer({ min: 2, max: 5 }),
        }),
        async (testData) => {
          const session = await service.initiateTransfer(
            'test.bin',
            path.join(tempDir, 'test.bin'),
            testData.fileSize,
            'upload'
          );

          const totalChunks = Math.ceil(testData.fileSize / (64 * 1024));
          const completedChunks = new Set<number>();

          // Simulate multiple resume attempts
          for (let attempt = 0; attempt < testData.resumeAttempts; attempt++) {
            // Mark some new chunks as completed
            const chunksPerAttempt = Math.ceil(totalChunks / testData.resumeAttempts);
            const startChunk = attempt * chunksPerAttempt;
            const endChunk = Math.min(startChunk + chunksPerAttempt, totalChunks);

            for (let i = startChunk; i < endChunk; i++) {
              if (!completedChunks.has(i)) {
                service.markChunkCompleted(session.sessionId, i);
                completedChunks.add(i);
              }
            }

            // Get pending chunks
            const pending = service.getPendingChunks(session.sessionId);

            // Verify no completed chunks are in pending list
            for (const chunkIndex of pending) {
              expect(completedChunks).not.toContain(chunkIndex);
            }

            // Verify pending count is correct
            expect(pending.length).toBe(totalChunks - completedChunks.size);
          }
        }
      ),
      { numRuns: 30 }
    );
  });

  it('should correctly identify pending chunks for partial transfers', async () => {
    // Property: For any partially completed transfer, the pending chunks list
    // SHALL accurately reflect only the chunks that still need to be transferred.
    // Validates: Requirements 1.3

    await fc.assert(
      fc.asyncProperty(
        fc.record({
          numChunks: fc.integer({ min: 1, max: 100 }),
          chunksToComplete: fc.array(
            fc.integer({ min: 0, max: 99 }),
            { minLength: 0, maxLength: 50 }
          ),
        }),
        async (testData) => {
          const fileSize = 64 * 1024 * testData.numChunks;
          const session = await service.initiateTransfer(
            'test.bin',
            path.join(tempDir, 'test.bin'),
            fileSize,
            'upload'
          );

          // Mark specific chunks as completed (only valid chunks)
          const uniqueChunks = Array.from(
            new Set(testData.chunksToComplete.filter((c) => c < testData.numChunks))
          );
          for (const chunkIndex of uniqueChunks) {
            service.markChunkCompleted(session.sessionId, chunkIndex);
          }

          // Get pending chunks
          const pending = service.getPendingChunks(session.sessionId);

          // Verify no completed chunks are in pending
          for (const chunkIndex of uniqueChunks) {
            expect(pending).not.toContain(chunkIndex);
          }

          // Verify all pending chunks are not in completed set
          for (const chunkIndex of pending) {
            expect(uniqueChunks).not.toContain(chunkIndex);
          }

          // Verify total count
          expect(pending.length + uniqueChunks.length).toBe(testData.numChunks);
        }
      ),
      { numRuns: 30 }
    );
  });

  it('should handle edge case of all chunks completed', async () => {
    // Property: For any transfer with all chunks marked as completed,
    // the pending chunks list SHALL be empty.
    // Validates: Requirements 1.3

    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 1, max: 50 }),
        async (numChunks) => {
          const fileSize = 64 * 1024 * numChunks;
          const session = await service.initiateTransfer(
            'test.bin',
            path.join(tempDir, 'test.bin'),
            fileSize,
            'upload'
          );

          // Mark all chunks as completed
          for (let i = 0; i < numChunks; i++) {
            service.markChunkCompleted(session.sessionId, i);
          }

          // Get pending chunks
          const pending = service.getPendingChunks(session.sessionId);

          // Verify no pending chunks
          expect(pending.length).toBe(0);
          expect(pending).toEqual([]);
        }
      ),
      { numRuns: 30 }
    );
  });

  it('should handle edge case of no chunks completed', async () => {
    // Property: For any transfer with no chunks marked as completed,
    // the pending chunks list SHALL contain all chunks.
    // Validates: Requirements 1.3

    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 1, max: 50 }),
        async (numChunks) => {
          const fileSize = 64 * 1024 * numChunks;
          const session = await service.initiateTransfer(
            'test.bin',
            path.join(tempDir, 'test.bin'),
            fileSize,
            'upload'
          );

          // Get pending chunks without marking any as completed
          const pending = service.getPendingChunks(session.sessionId);

          // Verify all chunks are pending
          expect(pending.length).toBe(numChunks);
          for (let i = 0; i < numChunks; i++) {
            expect(pending).toContain(i);
          }
        }
      ),
      { numRuns: 30 }
    );
  });
});


/**
 * Property 4: File Integrity Round Trip
 * Validates: Requirements 1.4
 */
describe('Property 4: File Integrity Round Trip', () => {
  let service: FileTransferService;
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'file-transfer-pbt-integrity-'));
    service = new FileTransferService({
      stateDbPath: path.join(tempDir, 'states'),
    });
  });

  afterEach(() => {
    service.destroy();
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('should verify file integrity with matching checksum', async () => {
    // Property: For any file transferred and verified, the SHA-256 checksum
    // of the received file SHALL match the checksum of the original file.
    // Validates: Requirements 1.4

    await fc.assert(
      fc.asyncProperty(
        fc.uint8Array({ minLength: 1, maxLength: 1024 * 1024 }),
        async (fileData) => {
          const sourceFile = path.join(tempDir, 'source.bin');
          const destFile = path.join(tempDir, 'dest.bin');

          // Write source file
          fs.writeFileSync(sourceFile, fileData);

          // Calculate source checksum
          const sourceChecksum = await service['manager'].calculateFileChecksum(sourceFile);

          // Create transfer session for destination
          const session = await service.initiateTransfer(
            'dest.bin',
            destFile,
            fileData.length,
            'download'
          );

          // Write destination file (simulating transfer)
          fs.writeFileSync(destFile, fileData);

          // Set checksum from source
          service.setChecksum(session.sessionId, sourceChecksum);

          // Verify integrity
          const isValid = await service.verifyIntegrity(session.sessionId);

          expect(isValid).toBe(true);
        }
      ),
      { numRuns: 50 }
    );
  });

  it('should detect file corruption', async () => {
    // Property: For any file with corrupted data, the checksum verification
    // SHALL detect the mismatch and return false.
    // Validates: Requirements 1.4

    await fc.assert(
      fc.asyncProperty(
        fc.record({
          fileData: fc.uint8Array({ minLength: 10, maxLength: 100 * 1024 }),
          corruptionIndex: fc.integer({ min: 0, max: 100 }),
        }),
        async (testData) => {
          const sourceFile = path.join(tempDir, 'source.bin');
          const destFile = path.join(tempDir, 'dest.bin');

          // Write source file
          fs.writeFileSync(sourceFile, testData.fileData);

          // Calculate source checksum
          const sourceChecksum = await service['manager'].calculateFileChecksum(sourceFile);

          // Create transfer session
          const session = await service.initiateTransfer(
            'dest.bin',
            destFile,
            testData.fileData.length,
            'download'
          );

          // Write corrupted destination file
          const corruptedData = Buffer.from(testData.fileData);
          const corruptIndex = testData.corruptionIndex % corruptedData.length;
          corruptedData[corruptIndex] = (corruptedData[corruptIndex] + 1) % 256;
          fs.writeFileSync(destFile, corruptedData);

          // Set checksum from source
          service.setChecksum(session.sessionId, sourceChecksum);

          // Verify integrity - should fail
          const isValid = await service.verifyIntegrity(session.sessionId);

          expect(isValid).toBe(false);
        }
      ),
      { numRuns: 50 }
    );
  });

  it('should maintain checksum consistency across multiple verifications', async () => {
    // Property: For any file, multiple integrity verifications SHALL produce
    // consistent results without modifying the file.
    // Validates: Requirements 1.4

    await fc.assert(
      fc.asyncProperty(
        fc.uint8Array({ minLength: 1, maxLength: 500 * 1024 }),
        async (fileData) => {
          const destFile = path.join(tempDir, 'dest.bin');

          // Write destination file
          fs.writeFileSync(destFile, fileData);

          // Calculate checksum
          const checksum = await service['manager'].calculateFileChecksum(destFile);

          // Create transfer session
          const session = await service.initiateTransfer(
            'dest.bin',
            destFile,
            fileData.length,
            'download'
          );

          // Set checksum
          service.setChecksum(session.sessionId, checksum);

          // Verify multiple times
          const results = [];
          for (let i = 0; i < 5; i++) {
            const isValid = await service.verifyIntegrity(session.sessionId);
            results.push(isValid);
          }

          // All verifications should be consistent
          expect(results).toEqual([true, true, true, true, true]);
        }
      ),
      { numRuns: 30 }
    );
  });

  it('should handle various file sizes for integrity verification', async () => {
    // Property: For any file size from 1 byte to 10MB, integrity verification
    // SHALL work correctly with SHA-256 checksums.
    // Validates: Requirements 1.4

    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 1, max: 10 * 1024 * 1024 }),
        async (fileSize) => {
          const destFile = path.join(tempDir, 'dest.bin');

          // Create file with specific size
          const fileData = Buffer.alloc(fileSize);
          for (let i = 0; i < fileSize; i++) {
            fileData[i] = i % 256;
          }
          fs.writeFileSync(destFile, fileData);

          // Calculate checksum
          const checksum = await service['manager'].calculateFileChecksum(destFile);

          // Create transfer session
          const session = await service.initiateTransfer(
            'dest.bin',
            destFile,
            fileSize,
            'download'
          );

          // Set checksum
          service.setChecksum(session.sessionId, checksum);

          // Verify integrity
          const isValid = await service.verifyIntegrity(session.sessionId);

          expect(isValid).toBe(true);
        }
      ),
      { numRuns: 30 }
    );
  });

  it('should detect single bit flips in files', async () => {
    // Property: For any file with a single bit flipped, the checksum
    // verification SHALL detect the corruption.
    // Validates: Requirements 1.4

    await fc.assert(
      fc.asyncProperty(
        fc.record({
          fileData: fc.uint8Array({ minLength: 10, maxLength: 100 * 1024 }),
          bitPosition: fc.integer({ min: 0, max: 7 }),
        }),
        async (testData) => {
          const sourceFile = path.join(tempDir, 'source.bin');
          const destFile = path.join(tempDir, 'dest.bin');

          // Write source file
          fs.writeFileSync(sourceFile, testData.fileData);

          // Calculate source checksum
          const sourceChecksum = await service['manager'].calculateFileChecksum(sourceFile);

          // Create transfer session
          const session = await service.initiateTransfer(
            'dest.bin',
            destFile,
            testData.fileData.length,
            'download'
          );

          // Write destination file with single bit flip
          const corruptedData = Buffer.from(testData.fileData);
          const byteIndex = Math.floor(Math.random() * corruptedData.length);
          corruptedData[byteIndex] ^= 1 << testData.bitPosition;
          fs.writeFileSync(destFile, corruptedData);

          // Set checksum from source
          service.setChecksum(session.sessionId, sourceChecksum);

          // Verify integrity - should fail
          const isValid = await service.verifyIntegrity(session.sessionId);

          expect(isValid).toBe(false);
        }
      ),
      { numRuns: 30 }
    );
  });
});


/**
 * Property 5: Transfer State Preserved on Failure
 * Validates: Requirements 1.5
 */
describe('Property 5: Transfer State Preserved on Failure', () => {
  let service: FileTransferService;
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'file-transfer-pbt-failure-'));
    service = new FileTransferService({
      stateDbPath: path.join(tempDir, 'states'),
    });
  });

  afterEach(() => {
    service.destroy();
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('should preserve transfer state when transfer fails', async () => {
    // Property: For any file transfer that fails after maximum retry attempts,
    // the transfer state SHALL be preserved and accessible for manual resume.
    // Validates: Requirements 1.5

    await fc.assert(
      fc.asyncProperty(
        fc.record({
          fileSize: fc.integer({ min: 1024, max: 10 * 1024 * 1024 }),
          chunksToComplete: fc.integer({ min: 0, max: 50 }),
        }),
        async (testData) => {
          const session = await service.initiateTransfer(
            'test.bin',
            path.join(tempDir, 'test.bin'),
            testData.fileSize,
            'upload'
          );

          // Mark some chunks as completed
          for (let i = 0; i < testData.chunksToComplete; i++) {
            service.markChunkCompleted(session.sessionId, i);
          }

          // Simulate failure by canceling the transfer
          await service.cancelTransfer(session.sessionId);

          // Verify state is still accessible
          const cancelledSession = service.getSession(session.sessionId);
          expect(cancelledSession).toBeDefined();
          expect(cancelledSession?.status).toBe('failed');
          expect(cancelledSession?.sessionId).toBe(session.sessionId);
          expect(cancelledSession?.fileName).toBe('test.bin');
          expect(cancelledSession?.totalSize).toBe(testData.fileSize);
        }
      ),
      { numRuns: 50 }
    );
  });

  it('should preserve completed chunks after failure', async () => {
    // Property: For any transfer that fails, the completed chunks information
    // SHALL be preserved so the transfer can be resumed from the correct point.
    // Validates: Requirements 1.5

    await fc.assert(
      fc.asyncProperty(
        fc.record({
          fileSize: fc.integer({ min: 64 * 1024, max: 5 * 1024 * 1024 }),
          chunksToComplete: fc.integer({ min: 1, max: 50 }),
        }),
        async (testData) => {
          const session = await service.initiateTransfer(
            'test.bin',
            path.join(tempDir, 'test.bin'),
            testData.fileSize,
            'upload'
          );

          // Mark chunks as completed
          for (let i = 0; i < testData.chunksToComplete; i++) {
            service.markChunkCompleted(session.sessionId, i);
          }

          // Simulate failure
          await service.cancelTransfer(session.sessionId);

          // Verify state is preserved
          const failedSession = service.getSession(session.sessionId);
          expect(failedSession?.chunksCompleted).toBe(testData.chunksToComplete);
          expect(failedSession?.status).toBe('failed');
        }
      ),
      { numRuns: 30 }
    );
  });

  it('should preserve checksum information after failure', async () => {
    // Property: For any transfer with checksum set before failure,
    // the checksum information SHALL be preserved for integrity verification.
    // Validates: Requirements 1.5

    await fc.assert(
      fc.asyncProperty(
        fc.record({
          fileSize: fc.integer({ min: 1024, max: 5 * 1024 * 1024 }),
          checksum: fc.string({ minLength: 64, maxLength: 64 }),
        }),
        async (testData) => {
          const session = await service.initiateTransfer(
            'test.bin',
            path.join(tempDir, 'test.bin'),
            testData.fileSize,
            'upload'
          );

          // Set checksum before failure
          service.setChecksum(session.sessionId, testData.checksum);

          // Simulate failure
          await service.cancelTransfer(session.sessionId);

          // Verify checksum is preserved
          const failedSession = service.getSession(session.sessionId);
          expect(failedSession?.checksum).toBe(testData.checksum);
        }
      ),
      { numRuns: 30 }
    );
  });

  it('should allow recovery after multiple failures', async () => {
    // Property: For any transfer that fails multiple times,
    // the state SHALL be preserved and accessible for recovery attempts.
    // Validates: Requirements 1.5

    await fc.assert(
      fc.asyncProperty(
        fc.record({
          fileSize: fc.integer({ min: 64 * 1024, max: 5 * 1024 * 1024 }),
          failureAttempts: fc.integer({ min: 1, max: 3 }),
        }),
        async (testData) => {
          const session = await service.initiateTransfer(
            'test.bin',
            path.join(tempDir, 'test.bin'),
            testData.fileSize,
            'upload'
          );

          // Simulate multiple failures
          for (let attempt = 0; attempt < testData.failureAttempts; attempt++) {
            // Mark some chunks
            const chunksPerAttempt = Math.ceil(
              (Math.ceil(testData.fileSize / (64 * 1024)) / testData.failureAttempts) * (attempt + 1)
            );
            for (let i = 0; i < chunksPerAttempt; i++) {
              service.markChunkCompleted(session.sessionId, i);
            }

            // Simulate failure
            await service.cancelTransfer(session.sessionId);

            // Verify state is still accessible
            const failedSession = service.getSession(session.sessionId);
            expect(failedSession).toBeDefined();
            expect(failedSession?.status).toBe('failed');
          }
        }
      ),
      { numRuns: 20 }
    );
  });

  it('should preserve file path for recovery', async () => {
    // Property: For any failed transfer, the file path information
    // SHALL be preserved so the transfer can be resumed to the correct location.
    // Validates: Requirements 1.5

    await fc.assert(
      fc.asyncProperty(
        fc.array(
          fc.string({ minLength: 5, maxLength: 20, unit: fc.char().filter(c => /[a-zA-Z0-9_-]/.test(c)) }),
          { minLength: 1, maxLength: 5 }
        ),
        async (fileNames) => {
          const sessions = [];

          for (const fileName of fileNames) {
            const session = await service.initiateTransfer(
              fileName,
              path.join(tempDir, fileName),
              1024 * 1024,
              'upload'
            );
            sessions.push(session);
          }

          // Simulate failures for all transfers
          for (const session of sessions) {
            await service.cancelTransfer(session.sessionId);
          }

          // Verify all file paths are preserved
          for (let i = 0; i < sessions.length; i++) {
            const failedSession = service.getSession(sessions[i].sessionId);
            expect(failedSession?.fileName).toBe(fileNames[i]);
            expect(failedSession?.filePath).toContain(fileNames[i]);
          }
        }
      ),
      { numRuns: 20 }
    );
  });

  it('should preserve metadata for failed transfers', async () => {
    // Property: For any failed transfer, all metadata (timestamps, size, etc.)
    // SHALL be preserved for recovery and audit purposes.
    // Validates: Requirements 1.5

    await fc.assert(
      fc.asyncProperty(
        fc.record({
          fileSize: fc.integer({ min: 1024, max: 5 * 1024 * 1024 }),
        }),
        async (testData) => {
          const beforeTime = Date.now();
          const session = await service.initiateTransfer(
            'test.bin',
            path.join(tempDir, 'test.bin'),
            testData.fileSize,
            'upload'
          );
          const afterTime = Date.now();

          // Simulate failure
          await service.cancelTransfer(session.sessionId);

          // Verify metadata is preserved
          const failedSession = service.getSession(session.sessionId);
          expect(failedSession?.createdAt).toBeGreaterThanOrEqual(beforeTime);
          expect(failedSession?.createdAt).toBeLessThanOrEqual(afterTime + 1000);
          expect(failedSession?.updatedAt).toBeGreaterThanOrEqual(failedSession?.createdAt || 0);
          expect(failedSession?.totalSize).toBe(testData.fileSize);
          expect(failedSession?.status).toBe('failed');
        }
      ),
      { numRuns: 30 }
    );
  });
});

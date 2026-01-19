/**
 * File Transfer Service
 * Handles file upload/download with resume capability, integrity verification, and progress tracking
 */

import { EventEmitter } from 'events';
import { FileTransferSession, TransferProgress } from '../../types/services';
import { FileTransferManager } from '../../utils/file-transfer-manager';
import * as fs from 'fs';

export interface FileTransferServiceConfig {
  chunkSize?: number;
  maxConcurrentTransfers?: number;
  retryAttempts?: number;
  retryBackoffMs?: number;
  stateDbPath?: string;
}

export class FileTransferService extends EventEmitter {
  private manager: FileTransferManager;
  private sessionMap: Map<string, FileTransferSession> = new Map();
  private readonly chunkSize: number;

  constructor(config: FileTransferServiceConfig = {}) {
    super();
    this.chunkSize = config.chunkSize || 64 * 1024; // 64KB default
    this.manager = new FileTransferManager(config);

    // Forward manager events
    this.manager.on('session:created', (state) => {
      this.emit('transfer:initiated', this.convertStateToSession(state));
    });

    this.manager.on('session:status-changed', ({ sessionId, status }) => {
      const session = this.sessionMap.get(sessionId);
      if (session) {
        session.status = status;
        session.updatedAt = Date.now();
        this.emit('transfer:status-changed', session);
      }
    });

    this.manager.on('chunk:completed', ({ sessionId, chunkIndex }) => {
      this.emit('transfer:chunk-completed', { sessionId, chunkIndex });
    });

    this.manager.on('transfer:started', ({ sessionId }) => {
      this.emit('transfer:started', this.sessionMap.get(sessionId));
    });

    this.manager.on('transfer:ended', ({ sessionId }) => {
      this.emit('transfer:ended', this.sessionMap.get(sessionId));
    });
  }

  /**
   * Initiate a new file transfer session
   */
  async initiateTransfer(
    fileName: string,
    filePath: string,
    totalSize: number,
    direction: 'upload' | 'download'
  ): Promise<FileTransferSession> {
    const sessionId = this.generateSessionId();

    // Create session in manager
    const state = this.manager.createSession(sessionId, fileName, filePath, totalSize);

    // Create session object for API
    const session: FileTransferSession = {
      sessionId,
      fileName,
      filePath,
      totalSize,
      chunksCompleted: 0,
      chunkSize: this.chunkSize,
      checksum: '',
      status: 'pending',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    this.sessionMap.set(sessionId, session);
    this.emit('transfer:initiated', session);

    return session;
  }

  /**
   * Resume an interrupted transfer
   */
  async resumeTransfer(sessionId: string): Promise<void> {
    const session = this.sessionMap.get(sessionId);
    if (!session) {
      throw new Error(`Transfer session ${sessionId} not found`);
    }

    const state = this.manager.getSession(sessionId);
    if (!state) {
      throw new Error(`Transfer state for session ${sessionId} not found`);
    }

    // Check if file exists
    if (!fs.existsSync(session.filePath)) {
      throw new Error(`File not found: ${session.filePath}`);
    }

    // Start transfer if not already active
    if (!this.manager.canStartTransfer()) {
      throw new Error('Maximum concurrent transfers reached');
    }

    this.manager.startTransfer(sessionId);
    session.status = 'in_progress';
    session.updatedAt = Date.now();
    this.emit('transfer:resumed', session);
  }

  /**
   * Cancel a transfer
   */
  async cancelTransfer(sessionId: string): Promise<void> {
    const session = this.sessionMap.get(sessionId);
    if (!session) {
      throw new Error(`Transfer session ${sessionId} not found`);
    }

    this.manager.endTransfer(sessionId);
    this.manager.updateSessionStatus(sessionId, 'failed');
    session.status = 'failed';
    session.updatedAt = Date.now();

    // Clean up partial files
    try {
      if (fs.existsSync(session.filePath)) {
        fs.unlinkSync(session.filePath);
      }
    } catch (error) {
      // Ignore cleanup errors
    }

    this.emit('transfer:cancelled', session);
  }

  /**
   * Get transfer progress
   */
  async getProgress(sessionId: string): Promise<TransferProgress> {
    const session = this.sessionMap.get(sessionId);
    if (!session) {
      throw new Error(`Transfer session ${sessionId} not found`);
    }

    const progress = this.manager.getProgress(sessionId);
    if (!progress) {
      throw new Error(`Progress for session ${sessionId} not found`);
    }

    const elapsedTime = (Date.now() - session.createdAt) / 1000; // seconds
    const speed = elapsedTime > 0 ? progress.bytesTransferred / elapsedTime : 0; // bytes per second
    const remainingBytes = progress.totalBytes - progress.bytesTransferred;
    const eta = speed > 0 ? remainingBytes / speed : 0; // seconds

    return {
      sessionId,
      bytesTransferred: progress.bytesTransferred,
      totalBytes: progress.totalBytes,
      percentage: progress.percentage,
      speed,
      eta,
      status: session.status,
    };
  }

  /**
   * Verify file integrity using SHA-256
   */
  async verifyIntegrity(sessionId: string): Promise<boolean> {
    const session = this.sessionMap.get(sessionId);
    if (!session) {
      throw new Error(`Transfer session ${sessionId} not found`);
    }

    const state = this.manager.getSession(sessionId);
    if (!state) {
      throw new Error(`Transfer state for session ${sessionId} not found`);
    }

    if (!state.checksum) {
      throw new Error(`No checksum available for session ${sessionId}`);
    }

    // Calculate checksum of received file
    const fileChecksum = await this.manager.calculateFileChecksum(session.filePath);

    return fileChecksum === state.checksum;
  }

  /**
   * Mark chunk as completed
   */
  markChunkCompleted(sessionId: string, chunkIndex: number): boolean {
    const session = this.sessionMap.get(sessionId);
    if (!session) {
      return false;
    }

    const result = this.manager.markChunkCompleted(sessionId, chunkIndex);
    if (result) {
      // Update session chunks completed count
      const progress = this.manager.getProgress(sessionId);
      if (progress) {
        session.chunksCompleted = progress.chunksCompleted;
        session.updatedAt = Date.now();
      }
    }

    return result;
  }

  /**
   * Get pending chunks for a session
   */
  getPendingChunks(sessionId: string): number[] {
    return this.manager.getPendingChunks(sessionId);
  }

  /**
   * Get chunk info
   */
  getChunkInfo(sessionId: string, chunkIndex: number) {
    return this.manager.getChunkInfo(sessionId, chunkIndex);
  }

  /**
   * Read chunk from file
   */
  async readChunk(sessionId: string, chunkIndex: number): Promise<Buffer> {
    const session = this.sessionMap.get(sessionId);
    if (!session) {
      throw new Error(`Transfer session ${sessionId} not found`);
    }

    const chunkInfo = this.manager.getChunkInfo(sessionId, chunkIndex);
    if (!chunkInfo) {
      throw new Error(`Invalid chunk index ${chunkIndex} for session ${sessionId}`);
    }

    return this.manager.readChunk(session.filePath, chunkInfo.offset, chunkInfo.size);
  }

  /**
   * Write chunk to file
   */
  async writeChunk(sessionId: string, chunkIndex: number, data: Buffer): Promise<void> {
    const session = this.sessionMap.get(sessionId);
    if (!session) {
      throw new Error(`Transfer session ${sessionId} not found`);
    }

    const chunkInfo = this.manager.getChunkInfo(sessionId, chunkIndex);
    if (!chunkInfo) {
      throw new Error(`Invalid chunk index ${chunkIndex} for session ${sessionId}`);
    }

    await this.manager.writeChunk(session.filePath, chunkInfo.offset, data);
  }

  /**
   * Set checksum for session
   */
  setChecksum(sessionId: string, checksum: string): boolean {
    const session = this.sessionMap.get(sessionId);
    if (!session) {
      return false;
    }

    const result = this.manager.setChecksum(sessionId, checksum);
    if (result) {
      session.checksum = checksum;
      session.updatedAt = Date.now();
    }

    return result;
  }

  /**
   * Get session by ID
   */
  getSession(sessionId: string): FileTransferSession | undefined {
    return this.sessionMap.get(sessionId);
  }

  /**
   * Get all active sessions
   */
  getAllSessions(): FileTransferSession[] {
    return Array.from(this.sessionMap.values());
  }

  /**
   * Delete session
   */
  deleteSession(sessionId: string): boolean {
    this.sessionMap.delete(sessionId);
    return this.manager.deleteSession(sessionId);
  }

  /**
   * Get active transfer count
   */
  getActiveTransferCount(): number {
    return this.manager.getActiveTransferCount();
  }

  /**
   * Convert manager state to session object
   */
  private convertStateToSession(state: any): FileTransferSession {
    const progress = this.manager.getProgress(state.sessionId);
    return {
      sessionId: state.sessionId,
      fileName: state.fileName,
      filePath: state.filePath,
      totalSize: state.totalSize,
      chunksCompleted: progress?.chunksCompleted || 0,
      chunkSize: state.chunkSize,
      checksum: state.checksum,
      status: state.status,
      createdAt: state.createdAt,
      updatedAt: state.updatedAt,
      error: state.error,
    };
  }

  /**
   * Generate unique session ID
   */
  private generateSessionId(): string {
    return `transfer_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Destroy service
   */
  destroy(): void {
    this.manager.destroy();
    this.sessionMap.clear();
    this.removeAllListeners();
  }
}

export default FileTransferService;

/**
 * File Transfer Manager
 * Core utility for file transfer operations including chunking, checksums, and state persistence
 */

import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import { EventEmitter } from 'events';
import { FileTransferState } from '../types/models';

export interface FileTransferManagerConfig {
  chunkSize?: number;
  maxConcurrentTransfers?: number;
  retryAttempts?: number;
  retryBackoffMs?: number;
  stateDbPath?: string;
}

export interface ChunkInfo {
  chunkIndex: number;
  offset: number;
  size: number;
  checksum: string;
}

export class FileTransferManager extends EventEmitter {
  private readonly chunkSize: number;
  private readonly maxConcurrentTransfers: number;
  private readonly retryAttempts: number;
  private readonly retryBackoffMs: number;
  private readonly stateDbPath: string;
  private transferStates: Map<string, FileTransferState> = new Map();
  private activeTransfers: Set<string> = new Set();

  constructor(config: FileTransferManagerConfig = {}) {
    super();
    this.chunkSize = config.chunkSize || 64 * 1024; // 64KB default
    this.maxConcurrentTransfers = config.maxConcurrentTransfers || 5;
    this.retryAttempts = config.retryAttempts || 3;
    this.retryBackoffMs = config.retryBackoffMs || 100;
    this.stateDbPath = config.stateDbPath || './transfer-states';

    // Ensure state directory exists
    this.ensureStateDirectory();
    this.loadPersistedStates();
  }

  /**
   * Create a new transfer session
   */
  createSession(
    sessionId: string,
    fileName: string,
    filePath: string,
    totalSize: number
  ): FileTransferState {
    const state: FileTransferState = {
      sessionId,
      fileName,
      filePath,
      totalSize,
      chunksCompleted: [],
      chunkSize: this.chunkSize,
      checksum: '',
      status: 'pending',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    this.transferStates.set(sessionId, state);
    this.persistState(sessionId, state);
    this.emit('session:created', state);

    return state;
  }

  /**
   * Get transfer session by ID
   */
  getSession(sessionId: string): FileTransferState | undefined {
    return this.transferStates.get(sessionId);
  }

  /**
   * Update session status
   */
  updateSessionStatus(
    sessionId: string,
    status: FileTransferState['status']
  ): FileTransferState | undefined {
    const state = this.transferStates.get(sessionId);
    if (!state) {
      return undefined;
    }

    state.status = status;
    state.updatedAt = Date.now();
    this.persistState(sessionId, state);
    this.emit('session:status-changed', { sessionId, status });

    return state;
  }

  /**
   * Mark chunk as completed
   */
  markChunkCompleted(sessionId: string, chunkIndex: number): boolean {
    const state = this.transferStates.get(sessionId);
    if (!state) {
      return false;
    }

    if (!state.chunksCompleted.includes(chunkIndex)) {
      state.chunksCompleted.push(chunkIndex);
      state.chunksCompleted.sort((a, b) => a - b);
      state.updatedAt = Date.now();
      this.persistState(sessionId, state);
      this.emit('chunk:completed', { sessionId, chunkIndex });
    }

    return true;
  }

  /**
   * Get chunks that need to be transferred
   */
  getPendingChunks(sessionId: string): number[] {
    const state = this.transferStates.get(sessionId);
    if (!state) {
      return [];
    }

    const totalChunks = Math.ceil(state.totalSize / state.chunkSize);
    const pending: number[] = [];

    for (let i = 0; i < totalChunks; i++) {
      if (!state.chunksCompleted.includes(i)) {
        pending.push(i);
      }
    }

    return pending;
  }

  /**
   * Get chunk information
   */
  getChunkInfo(sessionId: string, chunkIndex: number): ChunkInfo | undefined {
    const state = this.transferStates.get(sessionId);
    if (!state) {
      return undefined;
    }

    const offset = chunkIndex * state.chunkSize;
    if (offset >= state.totalSize) {
      return undefined;
    }

    const remainingSize = state.totalSize - offset;
    const size = Math.min(state.chunkSize, remainingSize);

    return {
      chunkIndex,
      offset,
      size,
      checksum: '', // Will be calculated when chunk is read
    };
  }

  /**
   * Calculate SHA-256 checksum for a file
   */
  async calculateFileChecksum(filePath: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const hash = crypto.createHash('sha256');
      const stream = fs.createReadStream(filePath);

      stream.on('data', (chunk) => {
        hash.update(chunk);
      });

      stream.on('end', () => {
        resolve(hash.digest('hex'));
      });

      stream.on('error', (error) => {
        reject(error);
      });
    });
  }

  /**
   * Calculate checksum for a buffer
   */
  calculateBufferChecksum(buffer: Buffer): string {
    return crypto.createHash('sha256').update(buffer).digest('hex');
  }

  /**
   * Calculate checksum for a chunk of a file
   */
  async calculateChunkChecksum(
    filePath: string,
    offset: number,
    size: number
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      const hash = crypto.createHash('sha256');
      const stream = fs.createReadStream(filePath, { start: offset, end: offset + size - 1 });

      stream.on('data', (chunk) => {
        hash.update(chunk);
      });

      stream.on('end', () => {
        resolve(hash.digest('hex'));
      });

      stream.on('error', (error) => {
        reject(error);
      });
    });
  }

  /**
   * Read a chunk from file
   */
  async readChunk(
    filePath: string,
    offset: number,
    size: number
  ): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      fs.open(filePath, 'r', (err, fd) => {
        if (err) {
          reject(err);
          return;
        }

        const buffer = Buffer.alloc(size);
        fs.read(fd, buffer, 0, size, offset, (err, bytesRead) => {
          fs.close(fd, () => {});
          if (err) {
            reject(err);
            return;
          }

          resolve(buffer.slice(0, bytesRead));
        });
      });
    });
  }

  /**
   * Write a chunk to file
   */
  async writeChunk(
    filePath: string,
    offset: number,
    data: Buffer
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      fs.open(filePath, 'a', (err, fd) => {
        if (err) {
          reject(err);
          return;
        }

        fs.write(fd, data, 0, data.length, offset, (err) => {
          fs.close(fd, () => {});
          if (err) {
            reject(err);
            return;
          }

          resolve();
        });
      });
    });
  }

  /**
   * Get transfer progress
   */
  getProgress(sessionId: string): {
    sessionId: string;
    bytesTransferred: number;
    totalBytes: number;
    percentage: number;
    chunksCompleted: number;
    totalChunks: number;
  } | undefined {
    const state = this.transferStates.get(sessionId);
    if (!state) {
      return undefined;
    }

    const totalChunks = Math.ceil(state.totalSize / state.chunkSize);
    const bytesTransferred = state.chunksCompleted.length * state.chunkSize;
    const percentage = (bytesTransferred / state.totalSize) * 100;

    return {
      sessionId,
      bytesTransferred,
      totalBytes: state.totalSize,
      percentage,
      chunksCompleted: state.chunksCompleted.length,
      totalChunks,
    };
  }

  /**
   * Set checksum for session
   */
  setChecksum(sessionId: string, checksum: string): boolean {
    const state = this.transferStates.get(sessionId);
    if (!state) {
      return false;
    }

    state.checksum = checksum;
    state.updatedAt = Date.now();
    this.persistState(sessionId, state);
    this.emit('session:checksum-set', { sessionId, checksum });

    return true;
  }

  /**
   * Delete transfer session
   */
  deleteSession(sessionId: string): boolean {
    const state = this.transferStates.get(sessionId);
    if (!state) {
      return false;
    }

    this.transferStates.delete(sessionId);
    this.activeTransfers.delete(sessionId);
    this.deletePersistedState(sessionId);
    this.emit('session:deleted', { sessionId });

    return true;
  }

  /**
   * Get all sessions
   */
  getAllSessions(): FileTransferState[] {
    return Array.from(this.transferStates.values());
  }

  /**
   * Check if can start new transfer (respects max concurrent limit)
   */
  canStartTransfer(): boolean {
    return this.activeTransfers.size < this.maxConcurrentTransfers;
  }

  /**
   * Mark transfer as active
   */
  startTransfer(sessionId: string): boolean {
    if (!this.canStartTransfer()) {
      return false;
    }

    this.activeTransfers.add(sessionId);
    this.updateSessionStatus(sessionId, 'in_progress');
    this.emit('transfer:started', { sessionId });

    return true;
  }

  /**
   * Mark transfer as inactive
   */
  endTransfer(sessionId: string): void {
    this.activeTransfers.delete(sessionId);
    this.emit('transfer:ended', { sessionId });
  }

  /**
   * Get active transfer count
   */
  getActiveTransferCount(): number {
    return this.activeTransfers.size;
  }

  /**
   * Persist state to disk
   */
  private persistState(sessionId: string, state: FileTransferState): void {
    try {
      const stateFile = path.join(this.stateDbPath, `${sessionId}.json`);
      fs.writeFileSync(stateFile, JSON.stringify(state, null, 2));
    } catch (error) {
      this.emit('error', {
        component: 'FileTransferManager',
        message: 'Failed to persist state',
        error,
        sessionId,
      });
    }
  }

  /**
   * Load persisted states from disk
   */
  private loadPersistedStates(): void {
    try {
      if (!fs.existsSync(this.stateDbPath)) {
        return;
      }

      const files = fs.readdirSync(this.stateDbPath);
      for (const file of files) {
        if (file.endsWith('.json')) {
          const stateFile = path.join(this.stateDbPath, file);
          const content = fs.readFileSync(stateFile, 'utf-8');
          const state: FileTransferState = JSON.parse(content);
          this.transferStates.set(state.sessionId, state);
        }
      }
    } catch (error) {
      this.emit('error', {
        component: 'FileTransferManager',
        message: 'Failed to load persisted states',
        error,
      });
    }
  }

  /**
   * Delete persisted state
   */
  private deletePersistedState(sessionId: string): void {
    try {
      const stateFile = path.join(this.stateDbPath, `${sessionId}.json`);
      if (fs.existsSync(stateFile)) {
        fs.unlinkSync(stateFile);
      }
    } catch (error) {
      this.emit('error', {
        component: 'FileTransferManager',
        message: 'Failed to delete persisted state',
        error,
        sessionId,
      });
    }
  }

  /**
   * Ensure state directory exists
   */
  private ensureStateDirectory(): void {
    if (!fs.existsSync(this.stateDbPath)) {
      fs.mkdirSync(this.stateDbPath, { recursive: true });
    }
  }

  /**
   * Clear all states (for testing)
   */
  clear(): void {
    this.transferStates.clear();
    this.activeTransfers.clear();
  }

  /**
   * Destroy manager
   */
  destroy(): void {
    this.clear();
    this.removeAllListeners();
  }
}

export default FileTransferManager;

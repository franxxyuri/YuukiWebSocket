/**
 * Data Model Definitions
 * Defines all data models used throughout the system
 */

// ============================================================================
// File Transfer State
// ============================================================================

export interface FileTransferState {
  sessionId: string;
  fileName: string;
  filePath: string;
  totalSize: number;
  chunksCompleted: number[];
  chunkSize: number;
  checksum: string;
  status: string;
  createdAt: number;
  updatedAt: number;
  error?: string;
}

// ============================================================================
// Connection State
// ============================================================================

export interface ConnectionState {
  connectionId: string;
  clientId: string;
  protocol: string;
  state: string;
  createdAt: number;
  lastActivityAt: number;
  activeSessions: {
    transfers: string[];
    screenMirrors: string[];
    remoteControl: boolean;
  };
}

// ============================================================================
// Metrics Storage
// ============================================================================

export interface MetricsRecord {
  timestamp: number;
  connectionId: string;
  cpu: number;
  memory: number;
  latency: number;
  bandwidth: number;
  transferSpeed: number;
  frameRate: number;
}

// ============================================================================
// Device Information
// ============================================================================

export interface DeviceInfo {
  deviceId: string;
  deviceName: string;
  deviceType: 'windows' | 'android' | 'ios' | 'macos' | 'linux';
  osVersion: string;
  screenResolution: {
    width: number;
    height: number;
  };
  capabilities: string[];
  lastSeen: number;
}

// ============================================================================
// Transfer Chunk
// ============================================================================

export interface TransferChunk {
  chunkId: string;
  sessionId: string;
  chunkIndex: number;
  data: Buffer;
  checksum: string;
  size: number;
  timestamp: number;
}

// ============================================================================
// Error Information
// ============================================================================

export interface ErrorInfo {
  errorId: string;
  errorCode: string;
  message: string;
  component: string;
  timestamp: number;
  context: any;
  stackTrace?: string;
}

// ============================================================================
// Configuration
// ============================================================================

export interface SystemConfig {
  // File Transfer
  fileTransfer: {
    chunkSize: number;
    maxConcurrentTransfers: number;
    retryAttempts: number;
    retryBackoffMs: number;
  };

  // Screen Mirror
  screenMirror: {
    defaultFrameRate: number;
    defaultResolution: string;
    defaultCodec: string;
    defaultQuality: number;
    maxQueueSize: number;
  };

  // Remote Control
  remoteControl: {
    maxQueueSize: number;
    batchIntervalMs: number;
    maxBatchSize: number;
    retryAttempts: number;
  };

  // Connection
  connection: {
    maxConcurrentConnections: number;
    healthCheckIntervalMs: number;
    connectionTimeoutMs: number;
    reconnectBackoffMs: number;
    maxReconnectAttempts: number;
  };

  // Monitoring
  monitoring: {
    metricsCollectionIntervalMs: number;
    logRetentionDays: number;
    logRotationSizeMb: number;
  };
}

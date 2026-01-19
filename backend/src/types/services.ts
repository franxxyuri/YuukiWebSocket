/**
 * Service Interface Definitions
 * Defines all core service interfaces for the Windows-Android Connect platform
 */

// ============================================================================
// File Transfer Service Interfaces
// ============================================================================

export interface FileTransferSession {
  sessionId: string;
  fileName: string;
  filePath: string;
  totalSize: number;
  chunksCompleted: number;
  chunkSize: number;
  checksum: string;
  status: 'pending' | 'in_progress' | 'paused' | 'completed' | 'failed';
  createdAt: number;
  updatedAt: number;
  error?: string;
}

export interface TransferProgress {
  sessionId: string;
  bytesTransferred: number;
  totalBytes: number;
  percentage: number;
  speed: number; // bytes per second
  eta: number; // seconds
  status: string;
}

export interface FileTransferService {
  initiateTransfer(
    fileName: string,
    filePath: string,
    totalSize: number,
    direction: 'upload' | 'download'
  ): Promise<FileTransferSession>;
  resumeTransfer(sessionId: string): Promise<void>;
  cancelTransfer(sessionId: string): Promise<void>;
  getProgress(sessionId: string): Promise<TransferProgress>;
  verifyIntegrity(sessionId: string): Promise<boolean>;
}

// ============================================================================
// Screen Mirror Service Interfaces
// ============================================================================

export interface ScreenFrame {
  frameId: string;
  timestamp: number;
  width: number;
  height: number;
  orientation: 'portrait' | 'landscape';
  data: Buffer; // Compressed frame data
  codec: 'h264' | 'vp9';
  quality: number; // 0-100
  size: number; // bytes
}

export interface MirrorOptions {
  frameRate: number; // default 30 FPS
  resolution: '720p' | '1080p' | '1440p' | '2160p';
  codec: 'h264' | 'vp9';
  quality: number; // 0-100
}

export interface ScreenMirrorService {
  startMirroring(options?: Partial<MirrorOptions>): Promise<void>;
  stopMirroring(): Promise<void>;
  getCurrentFrame(): Promise<ScreenFrame>;
  adjustQuality(bandwidth: number): Promise<void>;
  handleOrientationChange(orientation: 'portrait' | 'landscape'): Promise<void>;
}

// ============================================================================
// Remote Control Service Interfaces
// ============================================================================

export interface MouseEvent {
  action: 'move' | 'click' | 'scroll';
  x: number;
  y: number;
  button?: 'left' | 'right' | 'middle';
  wheelDelta?: number;
}

export interface KeyboardEvent {
  action: 'press' | 'release';
  keyCode: number;
  modifiers: {
    ctrl: boolean;
    shift: boolean;
    alt: boolean;
    meta: boolean;
  };
}

export interface TouchEvent {
  action: 'start' | 'move' | 'end';
  touches: Array<{
    id: number;
    x: number;
    y: number;
    pressure: number;
  }>;
}

export interface GestureEvent {
  type: 'swipe' | 'pinch' | 'rotate' | 'long_press';
  data: any;
}

export interface InputEvent {
  eventId: string;
  type: 'mouse' | 'keyboard' | 'touch' | 'gesture';
  timestamp: number;
  data: MouseEvent | KeyboardEvent | TouchEvent | GestureEvent;
}

export interface QueueStatus {
  queueLength: number;
  oldestEventAge: number; // milliseconds
  averageLatency: number; // milliseconds
}

export interface RemoteControlService {
  sendInputEvent(event: InputEvent): Promise<void>;
  batchSendEvents(events: InputEvent[]): Promise<void>;
  getQueueStatus(): Promise<QueueStatus>;
  clearQueue(): Promise<void>;
}

// ============================================================================
// Connection Manager Interfaces
// ============================================================================

export interface ConnectionMetrics {
  bytesIn: number;
  bytesOut: number;
  messagesIn: number;
  messagesOut: number;
  latency: number;
  packetLoss: number;
}

export interface Connection {
  connectionId: string;
  clientId: string;
  protocol: string;
  state: 'connecting' | 'connected' | 'disconnected' | 'error';
  createdAt: number;
  lastActivityAt: number;
  metrics: ConnectionMetrics;
}

export interface ConnectionManager {
  createConnection(clientId: string): Promise<Connection>;
  getConnection(connectionId: string): Promise<Connection>;
  closeConnection(connectionId: string): Promise<void>;
  healthCheck(connectionId: string): Promise<boolean>;
  getActiveConnections(): Promise<Connection[]>;
}

// ============================================================================
// Monitoring and Observability Interfaces
// ============================================================================

export interface SystemMetrics {
  timestamp: number;
  cpu: number; // percentage
  memory: number; // bytes
  connections: number;
  activeTransfers: number;
  activeScreenMirrors: number;
  networkLatency: number; // milliseconds
  networkBandwidth: number; // Mbps
}

export interface LogEntry {
  timestamp: number;
  level: 'DEBUG' | 'INFO' | 'WARN' | 'ERROR';
  component: string;
  message: string;
  context: any;
}

export interface SystemStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  uptime: number;
  metrics: SystemMetrics;
  activeServices: string[];
  errors: LogEntry[];
}

export interface MonitoringService {
  collectMetrics(): Promise<SystemMetrics>;
  log(level: string, component: string, message: string, context?: any): Promise<void>;
  getSystemStatus(): Promise<SystemStatus>;
  exportMetrics(format: 'prometheus' | 'json'): Promise<string>;
}

/**
 * Event Type Definitions
 * Defines all event types used throughout the system
 */

// ============================================================================
// File Transfer Events
// ============================================================================

export interface FileTransferInitiatedEvent {
  type: 'file-transfer:initiated';
  sessionId: string;
  fileName: string;
  totalSize: number;
  timestamp: number;
}

export interface FileTransferProgressEvent {
  type: 'file-transfer:progress';
  sessionId: string;
  bytesTransferred: number;
  totalBytes: number;
  percentage: number;
  speed: number;
  eta: number;
  timestamp: number;
}

export interface FileTransferCompletedEvent {
  type: 'file-transfer:completed';
  sessionId: string;
  fileName: string;
  totalSize: number;
  duration: number;
  checksum: string;
  timestamp: number;
}

export interface FileTransferFailedEvent {
  type: 'file-transfer:failed';
  sessionId: string;
  fileName: string;
  error: string;
  timestamp: number;
}

export interface FileTransferResumedEvent {
  type: 'file-transfer:resumed';
  sessionId: string;
  bytesAlreadyTransferred: number;
  timestamp: number;
}

export interface FileTransferCancelledEvent {
  type: 'file-transfer:cancelled';
  sessionId: string;
  bytesTransferred: number;
  timestamp: number;
}

// ============================================================================
// Screen Mirror Events
// ============================================================================

export interface ScreenMirrorStartedEvent {
  type: 'screen-mirror:started';
  frameRate: number;
  resolution: string;
  codec: string;
  timestamp: number;
}

export interface ScreenMirrorStoppedEvent {
  type: 'screen-mirror:stopped';
  totalFrames: number;
  duration: number;
  timestamp: number;
}

export interface ScreenFrameEvent {
  type: 'screen-frame';
  frameId: string;
  timestamp: number;
  width: number;
  height: number;
  quality: number;
  size: number;
}

export interface ScreenMirrorQualityAdjustedEvent {
  type: 'screen-mirror:quality-adjusted';
  frameRate: number;
  resolution: string;
  quality: number;
  reason: string;
  timestamp: number;
}

export interface ScreenMirrorReconnectedEvent {
  type: 'screen-mirror:reconnected';
  downtime: number;
  timestamp: number;
}

export interface OrientationChangedEvent {
  type: 'orientation:changed';
  orientation: 'portrait' | 'landscape';
  timestamp: number;
}

// ============================================================================
// Remote Control Events
// ============================================================================

export interface InputEventSentEvent {
  type: 'input-event:sent';
  eventId: string;
  eventType: string;
  timestamp: number;
}

export interface InputEventBatchSentEvent {
  type: 'input-event-batch:sent';
  batchId: string;
  eventCount: number;
  timestamp: number;
}

export interface InputEventFailedEvent {
  type: 'input-event:failed';
  eventId: string;
  error: string;
  retryCount: number;
  timestamp: number;
}

export interface InputQueueOverflowEvent {
  type: 'input-queue:overflow';
  queueSize: number;
  droppedEventCount: number;
  timestamp: number;
}

// ============================================================================
// Connection Events
// ============================================================================

export interface ConnectionEstablishedEvent {
  type: 'connection:established';
  connectionId: string;
  clientId: string;
  protocol: string;
  timestamp: number;
}

export interface ConnectionClosedEvent {
  type: 'connection:closed';
  connectionId: string;
  reason: string;
  duration: number;
  timestamp: number;
}

export interface ConnectionLostEvent {
  type: 'connection:lost';
  connectionId: string;
  timestamp: number;
}

export interface ConnectionReconnectingEvent {
  type: 'connection:reconnecting';
  connectionId: string;
  attemptNumber: number;
  nextRetryIn: number;
  timestamp: number;
}

export interface HealthCheckFailedEvent {
  type: 'health-check:failed';
  connectionId: string;
  reason: string;
  timestamp: number;
}

// ============================================================================
// Error Events
// ============================================================================

export interface ErrorOccurredEvent {
  type: 'error:occurred';
  errorId: string;
  errorCode: string;
  message: string;
  component: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  timestamp: number;
}

export interface ErrorRecoveredEvent {
  type: 'error:recovered';
  errorId: string;
  component: string;
  recoveryTime: number;
  timestamp: number;
}

// ============================================================================
// System Events
// ============================================================================

export interface SystemMetricsCollectedEvent {
  type: 'system-metrics:collected';
  cpu: number;
  memory: number;
  connections: number;
  timestamp: number;
}

export interface SystemHealthChangedEvent {
  type: 'system-health:changed';
  status: 'healthy' | 'degraded' | 'unhealthy';
  reason: string;
  timestamp: number;
}

export interface SystemAlertEvent {
  type: 'system:alert';
  alertId: string;
  severity: 'warning' | 'critical';
  message: string;
  component: string;
  timestamp: number;
}

// ============================================================================
// Union Type for All Events
// ============================================================================

export type SystemEvent =
  | FileTransferInitiatedEvent
  | FileTransferProgressEvent
  | FileTransferCompletedEvent
  | FileTransferFailedEvent
  | FileTransferResumedEvent
  | FileTransferCancelledEvent
  | ScreenMirrorStartedEvent
  | ScreenMirrorStoppedEvent
  | ScreenFrameEvent
  | ScreenMirrorQualityAdjustedEvent
  | ScreenMirrorReconnectedEvent
  | OrientationChangedEvent
  | InputEventSentEvent
  | InputEventBatchSentEvent
  | InputEventFailedEvent
  | InputQueueOverflowEvent
  | ConnectionEstablishedEvent
  | ConnectionClosedEvent
  | ConnectionLostEvent
  | ConnectionReconnectingEvent
  | HealthCheckFailedEvent
  | ErrorOccurredEvent
  | ErrorRecoveredEvent
  | SystemMetricsCollectedEvent
  | SystemHealthChangedEvent
  | SystemAlertEvent;

# Windows-Android Connect Optimization - Project Structure

## Overview

This document describes the project structure for the Windows-Android Connect optimization phase, focusing on core features (file transfer, screen mirroring, remote control) and comprehensive testing.

## Directory Structure

```
.
├── backend/
│   ├── src/
│   │   ├── services/
│   │   │   ├── file-transfer/
│   │   │   │   └── index.ts          # File Transfer Service implementation
│   │   │   ├── screen-mirror/
│   │   │   │   └── index.ts          # Screen Mirror Service implementation
│   │   │   ├── remote-control/
│   │   │   │   └── index.ts          # Remote Control Service implementation
│   │   │   └── monitoring/
│   │   │       └── index.ts          # Monitoring Service implementation
│   │   ├── types/
│   │   │   ├── services.ts           # Service interface definitions
│   │   │   ├── models.ts             # Data model definitions
│   │   │   └── events.ts             # Event type definitions
│   │   ├── config/
│   │   ├── middleware/
│   │   ├── routes/
│   │   ├── utils/
│   │   ├── websocket/
│   │   └── server.js
│   ├── tests/
│   │   ├── unit/
│   │   │   └── services/
│   │   │       ├── file-transfer.test.ts
│   │   │       ├── screen-mirror.test.ts
│   │   │       ├── remote-control.test.ts
│   │   │       └── monitoring.test.ts
│   │   ├── integration/
│   │   └── reports/
│   ├── tsconfig.json
│   └── README.md
├── frontend/
│   ├── src/
│   ├── tests/
│   └── tsconfig.json
├── jest.config.js                    # Jest configuration
├── jest.setup.js                     # Jest setup file
├── package.json                      # Project dependencies
├── tsconfig.json                     # Root TypeScript configuration
└── PROJECT_STRUCTURE.md              # This file
```

## Core Services

### 1. File Transfer Service (`backend/src/services/file-transfer/`)

**Responsibility**: Handle file upload/download with resume capability, integrity verification, and progress tracking.

**Key Features**:
- Session management with unique session IDs
- 64KB chunk-based transfer
- SHA-256 checksum verification
- Resume capability for interrupted transfers
- Progress tracking (percentage, speed, ETA)
- Support for files up to 10GB

**Interface**: `FileTransferService`

### 2. Screen Mirror Service (`backend/src/services/screen-mirror/`)

**Responsibility**: Capture, compress, and stream screen content in real-time with adaptive quality.

**Key Features**:
- 30 FPS default frame rate
- H.264 compression with adaptive quality
- Frame queue management (max 10 frames)
- Bandwidth-based quality adjustment
- Orientation change detection
- Automatic reconnection (3-second timeout)

**Interface**: `ScreenMirrorService`

### 3. Remote Control Service (`backend/src/services/remote-control/`)

**Responsibility**: Handle input events (mouse, keyboard, touch) with low latency and reliable delivery.

**Key Features**:
- Input event normalization (mouse, keyboard, touch, gesture)
- Event batching (10ms interval or 50 events)
- Input queue management (max 1000 events)
- Exponential backoff retry (max 3 attempts)
- Event replay on reconnection
- Gesture recognition (swipe, pinch, rotate, long-press)

**Interface**: `RemoteControlService`

### 4. Monitoring Service (`backend/src/services/monitoring/`)

**Responsibility**: Collect metrics, logs, and provide system health status.

**Key Features**:
- System metrics collection (CPU, memory, connections, latency, bandwidth)
- Structured logging with levels (DEBUG, INFO, WARN, ERROR)
- Log rotation and retention (30 days)
- Metrics export (Prometheus, JSON formats)
- System health status determination
- Real-time metrics collection

**Interface**: `MonitoringService`

## Type Definitions

### `backend/src/types/services.ts`

Defines all service interfaces:
- `FileTransferService`, `FileTransferSession`, `TransferProgress`
- `ScreenMirrorService`, `ScreenFrame`, `MirrorOptions`
- `RemoteControlService`, `InputEvent`, `QueueStatus`
- `ConnectionManager`, `Connection`, `ConnectionMetrics`
- `MonitoringService`, `SystemMetrics`, `LogEntry`, `SystemStatus`

### `backend/src/types/models.ts`

Defines data models:
- `FileTransferState` - Persisted file transfer state
- `ConnectionState` - Connection state information
- `MetricsRecord` - Metrics storage format
- `DeviceInfo` - Device information
- `TransferChunk` - File transfer chunk
- `ErrorInfo` - Error information
- `SystemConfig` - System configuration

### `backend/src/types/events.ts`

Defines event types:
- File Transfer Events (initiated, progress, completed, failed, resumed, cancelled)
- Screen Mirror Events (started, stopped, frame, quality adjusted, reconnected)
- Remote Control Events (event sent, batch sent, failed, queue overflow)
- Connection Events (established, closed, lost, reconnecting, health check failed)
- Error Events (occurred, recovered)
- System Events (metrics collected, health changed, alert)

## Testing Framework

### Jest Configuration (`jest.config.js`)

- **Test Environment**: Node.js
- **Transform**: TypeScript via ts-jest
- **Coverage Target**: 80% for core modules
- **Test Patterns**: `**/*.test.ts`, `**/*.test.tsx`, `**/*.test.js`, `**/*.test.jsx`
- **Coverage Reporters**: text, text-summary, html, json, lcov

### Test Structure

```
backend/tests/
├── unit/
│   └── services/
│       ├── file-transfer.test.ts
│       ├── screen-mirror.test.ts
│       ├── remote-control.test.ts
│       └── monitoring.test.ts
├── integration/
│   └── (integration tests to be added)
└── reports/
    └── (test reports)
```

### Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run with coverage
npm run test:coverage

# Run only unit tests
npm run test:unit

# Run only integration tests
npm run test:integration
```

## Dependencies

### Production Dependencies
- `express` - Web framework
- `ws` - WebSocket library
- `socket.io` - Real-time communication
- `cors` - CORS middleware
- `dotenv` - Environment variables
- `react` - Frontend framework
- `react-dom` - React DOM
- `react-router-dom` - Routing

### Development Dependencies
- `typescript` - TypeScript compiler
- `ts-jest` - Jest TypeScript support
- `jest` - Testing framework
- `@testing-library/react` - React testing utilities
- `@testing-library/jest-dom` - Jest DOM matchers
- `@types/jest` - Jest type definitions
- `@types/node` - Node.js type definitions
- `vite` - Build tool
- `@vitejs/plugin-react` - Vite React plugin

## Configuration Files

### `jest.config.js`
Jest testing framework configuration with TypeScript support, coverage thresholds, and test patterns.

### `jest.setup.js`
Jest setup file with custom matchers and global test utilities.

### `backend/tsconfig.json`
TypeScript configuration for backend with path aliases and strict mode enabled.

### `tsconfig.json`
Root TypeScript configuration for the entire project.

### `package.json`
Project dependencies and npm scripts for development, testing, and building.

## Development Workflow

### 1. Setting Up the Project

```bash
# Install dependencies
npm install

# Verify TypeScript compilation
npx tsc --noEmit
```

### 2. Running Tests

```bash
# Run all tests
npm test

# Run tests with coverage
npm run test:coverage

# Run tests in watch mode
npm run test:watch
```

### 3. Building

```bash
# Build frontend
npm run build

# Build backend (if needed)
npx tsc -p backend/tsconfig.json
```

### 4. Development Server

```bash
# Start development server
npm run dev

# Start with Vite
npm run dev:vite
```

## Next Steps

1. **Phase 2**: Implement Connection Manager and Health Check System
2. **Phase 3**: Implement Monitoring and Observability Layer
3. **Phase 4**: Implement File Transfer Service - Core
4. **Phase 5**: Implement File Transfer - Resume and Recovery
5. **Phase 6**: Implement File Transfer - Progress Tracking
6. **Phase 7**: Implement Screen Mirror Service - Core
7. **Phase 8**: Implement Screen Mirror - Adaptive Quality
8. **Phase 9**: Implement Remote Control Service - Core
9. **Phase 10**: Implement Remote Control - Event Batching
10. **Phase 11**: Performance Optimization and Testing

## References

- **Requirements**: `.kiro/specs/windows-android-connect-optimization/requirements.md`
- **Design**: `.kiro/specs/windows-android-connect-optimization/design.md`
- **Tasks**: `.kiro/specs/windows-android-connect-optimization/tasks.md`

## Notes

- All services extend `EventEmitter` for event-driven architecture
- TypeScript strict mode is enabled for type safety
- Tests follow the AAA pattern (Arrange, Act, Assert)
- Coverage target is 80% for core modules
- Property-based tests will be added for universal correctness properties

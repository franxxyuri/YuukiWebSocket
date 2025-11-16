# Windows-Android Connect Project Startup Guide (Updated Version)

## Overview

This document records the startup and configuration instructions for the Windows-Android Connect project, including access methods for all pages and startup scripts.

## Project Structure

This project contains a complete Windows-Android LAN interconnection software supporting the following functions:

- File transfer
- Screen mirroring
- Remote control
- Notification sync
- Clipboard sync

## Startup Scripts

### 1. Start All Services (Recommended)

```bash
start-all-services.bat
```

This script will automatically start the main server and Vite development server in the background.

### 2. Restart Server

```bash
restart-server.bat
```

This script will stop existing services and restart all server components.

### 3. Start Vite Development Server

```bash
npm run dev:vite
```

### 4. Start Main Server

```bash
npm run server
```

or

```bash
node complete-server.js
```

## Page Access

After starting the servers, you can access different pages via the following URLs:

### 1. React App Page (Vite Development Server)

- **Main Page**: http://localhost:3000
- **Test Page**: http://localhost:3000/test-ui.html
- **Screen Streaming Page**: http://localhost:3000/screen-stream.html

### 2. Express Server Page

- **Main Page**: http://localhost:8828
- **Device Discovery Service**: http://localhost:8090
- **Screen Streaming Page**: http://localhost:8828 (as default page)

## Server Configuration

### Main Server (complete-server.js)

- Port: 8828
- Function: WebSocket server, file transfer, etc.
- Supported Devices: Android devices via LAN connection

### Device Discovery Service (device-discovery.js)

- Port: 8090
- Function: Discover and manage connected Android devices

### Vite Development Server

- Port: 3000
- Function: Provide React app and static resources
- Multi-page support: index.html, test-ui.html, screen-stream.html
- Proxy configuration: Proxy /ws requests to backend server (port 8828)

## Connection Guide

### Android Client Connection Configuration

The Android client needs to connect to the Windows server's IP address and port 8828.

1. Ensure Android device and Windows computer are on the same LAN
2. Enter the Windows computer's LAN IP address in the Android app
3. Port is 8828
4. Click the "Connect" button

### Vite Frontend Connection Configuration

The Vite frontend (port 3000) automatically connects to the backend server (port 8828) through proxy configuration.

## Outdated Files Notice

The following files use old port configurations and have been renamed with .old extension to avoid conflicts:
- `device-discovery.js.old` - Originally used port 8080
- `integrated-server.js.old` - Originally used ports 8080/8827
- `full-integrated-server.js.old` - Originally used ports 8080/8827
- `test-client.js.old` - Originally connected to port 8080

Currently used correct configuration files:
- `complete-server.js` - Uses port 8828 (WebSocket) and 8090 (device discovery)

## Background Service Management

Services will run in the background after startup. You can manage them through the following methods:

1. Check Node.js processes in Task Manager
2. Use `taskkill /PID <process ID>` command to terminate specific processes (use with caution)
3. Make sure to close previous processes before restarting services

## Project Configuration Files

### vite-config.js

Configured with multi-page support and WebSocket proxy, including:
- Main page (index.html)
- Test page (test-ui.html)
- Screen streaming page (screen-stream.html)
- Proxy configuration: Proxy WebSocket requests to backend server (port 8828)

### package.json

Added new scripts:
- `dev:vite`: Start Vite development server

## Style Fixes

Updated `src/App.css` file to ensure all elements in the React app display correctly.

## Dependencies

Project dependencies include:
- React and ReactDOM
- Socket.io for WebSocket communication
- Vite as development server
- Express as backend server

## Troubleshooting

When connection issues occur, check the following steps:

1. Confirm backend server is started and listening on port 8828
2. Confirm Vite server is started and listening on port 3000
3. Check if proxy configuration is correct
4. Check if Android client is configured with correct IP address and port number
5. Verify network connectivity (ping test)
6. Check if firewall settings block port communication
7. Confirm ports are not occupied by other programs
8. Ensure all devices are on the same LAN
9. Make sure not using outdated configuration files with .old extension
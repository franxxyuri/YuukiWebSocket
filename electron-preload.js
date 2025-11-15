const { contextBridge, ipcRenderer } = require('electron');

// 向渲染进程暴露安全的API
contextBridge.exposeInMainWorld('electronAPI', {
  // 应用信息
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),
  
  // 文件对话框
  showOpenDialog: (options) => ipcRenderer.invoke('show-open-dialog', options),
  showSaveDialog: (options) => ipcRenderer.invoke('show-save-dialog', options),
  showMessageBox: (options) => ipcRenderer.invoke('show-message-box', options),
  
  // 设备发现
  startDeviceDiscovery: () => ipcRenderer.invoke('start-device-discovery'),
  stopDeviceDiscovery: () => ipcRenderer.invoke('stop-device-discovery'),
  getDiscoveredDevices: () => ipcRenderer.invoke('get-discovered-devices'),
  getDeviceStats: () => ipcRenderer.invoke('get-device-stats'),
  
  // 文件传输
  sendFile: (filePath, targetDeviceId, options) => ipcRenderer.invoke('send-file', filePath, targetDeviceId, options),
  receiveFile: (transferInfo, savePath) => ipcRenderer.invoke('receive-file', transferInfo, savePath),
  getTransferStatus: (transferId) => ipcRenderer.invoke('get-transfer-status', transferId),
  getAllTransfers: () => ipcRenderer.invoke('get-all-transfers'),
  getActiveTransfers: () => ipcRenderer.invoke('get-active-transfers'),
  pauseTransfer: (transferId) => ipcRenderer.invoke('pause-transfer', transferId),
  resumeTransfer: (transferId) => ipcRenderer.invoke('resume-transfer', transferId),
  cancelTransfer: (transferId) => ipcRenderer.invoke('cancel-transfer', transferId),
  getTransferStats: () => ipcRenderer.invoke('get-transfer-stats'),
  
  // 屏幕控制
  captureScreen: () => ipcRenderer.invoke('capture-screen'),
  stopScreenCapture: () => ipcRenderer.invoke('stop-screen-capture'),
  
  // 屏幕投屏
  startScreenStreaming: (deviceInfo) => ipcRenderer.invoke('start-screen-streaming', deviceInfo),
  stopScreenStreaming: (deviceInfo) => ipcRenderer.invoke('stop-screen-streaming', deviceInfo),
  getScreenStreamStatus: (deviceId) => ipcRenderer.invoke('get-screen-stream-status', deviceId),
  
  // 远程控制
  enableRemoteControl: (deviceInfo) => ipcRenderer.invoke('enable-remote-control', deviceInfo),
  disableRemoteControl: (deviceInfo) => ipcRenderer.invoke('disable-remote-control', deviceInfo),
  sendControlEvent: (eventData) => ipcRenderer.invoke('send-control-event', eventData),
  getControlStatus: (deviceId) => ipcRenderer.invoke('get-control-status', deviceId),
  
  // 网络连接
  connectToDevice: (deviceInfo) => ipcRenderer.invoke('connect-to-device', deviceInfo),
  disconnectFromDevice: (connectionId) => ipcRenderer.invoke('disconnect-from-device', connectionId),
  getConnections: () => ipcRenderer.invoke('get-connections'),
  getActiveConnections: () => ipcRenderer.invoke('get-active-connections'),
  sendMessage: (connectionId, message) => ipcRenderer.invoke('send-message', connectionId, message),
  getNetworkStats: () => ipcRenderer.invoke('get-network-stats'),
  
  // 通知
  showNotification: (title, body) => ipcRenderer.invoke('show-notification', title, body),
  
  // 事件监听
  onDeviceFound: (callback) => ipcRenderer.on('device-found', callback),
  onDeviceLost: (callback) => ipcRenderer.on('device-lost', callback),
  onConnectionStateChange: (callback) => ipcRenderer.on('connection-state-change', callback),
  onFileTransferProgress: (callback) => ipcRenderer.on('file-transfer-progress', callback),
  onScreenFrameReceived: (callback) => ipcRenderer.on('screen-frame-received', callback),
  onScreenStreamingStart: (callback) => ipcRenderer.on('screen-streaming-start', callback),
  onScreenStreamingStop: (callback) => ipcRenderer.on('screen-streaming-stop', callback),
  onScreenFrameData: (callback) => ipcRenderer.on('screen-frame-data', callback),
  onRemoteControlEnabled: (callback) => ipcRenderer.on('remote-control-enabled', callback),
  onRemoteControlDisabled: (callback) => ipcRenderer.on('remote-control-disabled', callback),
  onControlEventReceived: (callback) => ipcRenderer.on('control-event-received', callback),
  
  // 移除监听器
  removeAllListeners: (channel) => ipcRenderer.removeAllListeners(channel)
});

// 添加控制台日志
console.log('Preload script loaded');

// 检查API是否正确暴露
console.log('Electron API exposed:', window.electronAPI ? 'Yes' : 'No');
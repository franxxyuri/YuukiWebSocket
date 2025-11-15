const { app, BrowserWindow, Menu, dialog, ipcMain, shell } = require('electron');
const path = require('path');
const isDev = process.env.NODE_ENV === 'development';

// 导入核心模块
const DeviceDiscovery = require('./device-discovery.js');
const FileTransfer = require('./file-transfer.js');
const NetworkCommunication = require('./network-communication.js');

// 保持对窗口对象的全局引用，如果不这么做，当JavaScript对象被垃圾回收时，窗口对象将会被自动关闭
let mainWindow;

class WindowManager {
  constructor() {
    this.windows = new Map();
    // 设置全局主窗口引用
    global.mainWindow = null;
  }

  createMainWindow() {
    // 创建浏览器窗口
    mainWindow = new BrowserWindow({
      width: 1200,
      height: 800,
      minWidth: 800,
      minHeight: 600,
      webPreferences: {
        nodeIntegration: true,
        contextIsolation: true,
        enableRemoteModule: true,
        preload: path.join(__dirname, 'preload.js')
      },
      
      show: false,
      titleBarStyle: 'default'
    });

    // 加载应用的 index.html
    mainWindow.loadFile('index.html');

    // 设置全局主窗口引用
    global.mainWindow = mainWindow;

    // 当窗口准备显示时才显示
    mainWindow.once('ready-to-show', () => {
      mainWindow.show();
      
      // 如果是开发模式，打开开发者工具
      if (isDev) {
        mainWindow.webContents.openDevTools();
      }
      
      console.log('✅ 主窗口已创建并显示');
    });

    // 处理窗口关闭事件
    mainWindow.on('closed', () => {
      console.log('🪟 主窗口已关闭');
      mainWindow = null;
      global.mainWindow = null;
    });

    // 处理外部链接
    mainWindow.webContents.setWindowOpenHandler(({ url }) => {
      shell.openExternal(url);
      return { action: 'deny' };
    });

    this.setupMenu();
    return mainWindow;
  }

  setupMenu() {
    const template = [
      {
        label: '文件',
        submenu: [
          {
            label: '退出',
            accelerator: process.platform === 'darwin' ? 'Cmd+Q' : 'Ctrl+Q',
            click: () => {
              app.quit();
            }
          }
        ]
      },
      {
        label: '编辑',
        submenu: [
          { label: '复制', accelerator: 'CmdOrCtrl+C', role: 'copy' },
          { label: '粘贴', accelerator: 'CmdOrCtrl+V', role: 'paste' },
          { label: '剪切', accelerator: 'CmdOrCtrl+X', role: 'cut' },
          { label: '全选', accelerator: 'CmdOrCtrl+A', role: 'selectall' }
        ]
      },
      {
        label: '视图',
        submenu: [
          { label: '重新加载', accelerator: 'CmdOrCtrl+R', role: 'reload' },
          { label: '强制重新加载', accelerator: 'CmdOrCtrl+Shift+R', role: 'forceReload' },
          { label: '开发者工具', accelerator: 'F12', role: 'toggleDevTools' },
          { label: '实际大小', accelerator: 'CmdOrCtrl+0', role: 'resetZoom' },
          { label: '放大', accelerator: 'CmdOrCtrl+Plus', role: 'zoomIn' },
          { label: '缩小', accelerator: 'CmdOrCtrl+-', role: 'zoomOut' },
          { type: 'separator' },
          { label: '切换全屏', accelerator: 'F11', role: 'togglefullscreen' }
        ]
      },
      {
        label: '窗口',
        submenu: [
          { label: '最小化', accelerator: 'CmdOrCtrl+M', role: 'minimize' },
          { label: '关闭', accelerator: 'CmdOrCtrl+W', role: 'close' }
        ]
      },
      {
        label: '帮助',
        submenu: [
          {
            label: '关于',
            click: () => {
              dialog.showMessageBox(mainWindow, {
                type: 'info',
                title: '关于',
                message: 'Windows-Android Connect',
                detail: '一个功能完整的Windows-Android局域网互联软件\n版本: 1.0.0'
              });
            }
          },
          {
            label: '查看文档',
            click: () => {
              shell.openExternal('https://github.com/your-username/windows-android-connect');
            }
          }
        ]
      }
    ];

    // macOS的菜单需要特殊处理
    if (process.platform === 'darwin') {
      template.unshift({
        label: app.getName(),
        submenu: [
          { label: '关于 ' + app.getName(), role: 'about' },
          { type: 'separator' },
          { label: '服务', role: 'services', submenu: [] },
          { type: 'separator' },
          { label: '隐藏 ' + app.getName(), accelerator: 'Command+H', role: 'hide' },
          { label: '隐藏其他', accelerator: 'Command+Shift+H', role: 'hideothers' },
          { label: '显示全部', role: 'unhide' },
          { type: 'separator' },
          { label: '退出', accelerator: 'Command+Q', click: () => app.quit() }
        ]
      });

      // 窗口菜单
      template[4].submenu = [
        { label: '关闭', accelerator: 'Command+W', role: 'close' },
        { label: '最小化', accelerator: 'Command+M', role: 'minimize' },
        { label: '缩放', role: 'zoom' },
        { type: 'separator' },
        { label: '切换全屏', accelerator: 'Ctrl+Command+F', role: 'togglefullscreen' }
      ];
    }

    const menu = Menu.buildFromTemplate(template);
    Menu.setApplicationMenu(menu);
  }
}

// 设备发现和文件传输模块已移至独立文件
// 现在使用从 device-discovery.js 和 file-transfer.js 导入的类

// 初始化核心模块
const windowManager = new WindowManager();
const deviceDiscovery = new DeviceDiscovery();
const fileTransfer = new FileTransfer();
const networkCommunication = new NetworkCommunication();

// Electron应用准备就绪
app.whenReady().then(async () => {
  try {
    console.log('🚀 启动Windows-Android Connect应用...');
    
    // 启动网络通信服务器
    await networkCommunication.startServer();
    networkCommunication.startHeartbeatCheck();
    
    // 创建主窗口
    windowManager.createMainWindow();
    
    console.log('✅ 应用启动完成');
    
  } catch (error) {
    console.error('❌ 应用启动失败:', error);
  }
  
  // macOS特殊处理
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      windowManager.createMainWindow();
    }
  });
});

// 所有窗口关闭时退出应用
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// IPC处理程序
ipcMain.handle('get-app-version', () => {
  return app.getVersion();
});

ipcMain.handle('show-open-dialog', async (event, options) => {
  return await dialog.showOpenDialog(mainWindow, options);
});

ipcMain.handle('show-save-dialog', async (event, options) => {
  return await dialog.showSaveDialog(mainWindow, options);
});

ipcMain.handle('show-message-box', async (event, options) => {
  return await dialog.showMessageBox(mainWindow, options);
});

// 设备发现相关的IPC
ipcMain.handle('start-device-discovery', async () => {
  try {
    const result = await deviceDiscovery.startDiscovery();
    if (result) {
      // 启动设备清理任务
      deviceDiscovery.startDeviceCleanup();
      console.log('✅ 设备发现已启动');
    }
    return result;
  } catch (error) {
    console.error('❌ 启动设备发现失败:', error);
    throw error;
  }
});

ipcMain.handle('stop-device-discovery', async () => {
  try {
    // 停止设备清理任务
    deviceDiscovery.stopDeviceCleanup();
    const result = await deviceDiscovery.stopDiscovery();
    console.log('✅ 设备发现已停止');
    return result;
  } catch (error) {
    console.error('❌ 停止设备发现失败:', error);
    throw error;
  }
});

ipcMain.handle('get-discovered-devices', () => {
  return deviceDiscovery.getDiscoveredDevices();
});

ipcMain.handle('get-device-stats', () => {
  return deviceDiscovery.getDeviceStats();
});

// 文件传输相关的IPC
ipcMain.handle('send-file', async (event, filePath, targetDeviceId, options = {}) => {
  try {
    const result = await fileTransfer.sendFile(filePath, targetDeviceId, options);
    console.log(`📁 开始传输文件: ${result.fileName}`);
    return result;
  } catch (error) {
    console.error('❌ 文件传输失败:', error);
    throw error;
  }
});

ipcMain.handle('receive-file', async (event, transferInfo, savePath = null) => {
  try {
    const result = await fileTransfer.receiveFile(transferInfo, savePath);
    console.log(`📁 开始接收文件: ${result.fileName}`);
    return result;
  } catch (error) {
    console.error('❌ 文件接收失败:', error);
    throw error;
  }
});

ipcMain.handle('get-transfer-status', (event, transferId) => {
  return fileTransfer.getTransfer(transferId);
});

ipcMain.handle('get-all-transfers', () => {
  return fileTransfer.getAllTransfers();
});

ipcMain.handle('get-active-transfers', () => {
  return fileTransfer.getActiveTransfers();
});

ipcMain.handle('pause-transfer', (event, transferId) => {
  return fileTransfer.pauseTransfer(transferId);
});

ipcMain.handle('resume-transfer', (event, transferId) => {
  return fileTransfer.resumeTransfer(transferId);
});

ipcMain.handle('cancel-transfer', (event, transferId) => {
  return fileTransfer.cancelTransfer(transferId);
});

ipcMain.handle('get-transfer-stats', () => {
  return fileTransfer.getTransferStats();
});

// 屏幕控制相关的IPC
ipcMain.handle('capture-screen', () => {
  console.log('开始屏幕捕获...');
  
  // 创建屏幕捕获窗口
  const screenCaptureWindow = new BrowserWindow({
    width: 400,
    height: 300,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    },
    title: '屏幕捕获窗口',
    show: false
  });
  
  screenCaptureWindow.loadFile('screen-capture.html');
  
  screenCaptureWindow.once('ready-to-show', () => {
    screenCaptureWindow.show();
    console.log('✅ 屏幕捕获窗口已显示');
  });
  
  return true;
});

ipcMain.handle('stop-screen-capture', () => {
  console.log('停止屏幕捕获...');
  return true;
});

// 屏幕投屏相关的IPC
ipcMain.handle('start-screen-streaming', async (event, deviceInfo) => {
  try {
    console.log(`开始屏幕投屏: ${deviceInfo.name}`);
    
    // 发送开始屏幕投屏指令给Android设备
    await networkCommunication.sendMessageToDevice(deviceInfo.deviceId, {
      type: 'command',
      command: 'START_SCREEN_CAPTURE',
      data: {
        width: 1920,
        height: 1080,
        fps: 30,
        quality: 0.8
      }
    });
    
    return { success: true, message: '已发送屏幕投屏指令' };
    
  } catch (error) {
    console.error('❌ 启动屏幕投屏失败:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('stop-screen-streaming', async (event, deviceInfo) => {
  try {
    console.log(`停止屏幕投屏: ${deviceInfo.name}`);
    
    // 发送停止屏幕投屏指令给Android设备
    await networkCommunication.sendMessageToDevice(deviceInfo.deviceId, {
      type: 'command',
      command: 'STOP_SCREEN_CAPTURE'
    });
    
    return { success: true, message: '已发送停止屏幕投屏指令' };
    
  } catch (error) {
    console.error('❌ 停止屏幕投屏失败:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('get-screen-stream-status', (event, deviceId) => {
  try {
    const connection = networkCommunication.getConnection(deviceId);
    if (!connection) {
      return { streaming: false, device: null };
    }
    
    return {
      streaming: true,
      device: connection.deviceInfo,
      connectionTime: connection.startTime,
      stats: connection.screenStats || {}
    };
    
  } catch (error) {
    console.error('❌ 获取屏幕流状态失败:', error);
    return { streaming: false, error: error.message };
  }
});

// 远程控制相关的IPC
ipcMain.handle('enable-remote-control', (event, deviceInfo) => {
  try {
    console.log(`启用远程控制: ${deviceInfo.name}`);
    
    // 发送启用远程控制指令给Android设备
    networkCommunication.sendMessageToDevice(deviceInfo.deviceId, {
      type: 'command',
      command: 'ENABLE_REMOTE_CONTROL'
    });
    
    return { success: true, message: '远程控制已启用' };
    
  } catch (error) {
    console.error('❌ 启用远程控制失败:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('disable-remote-control', (event, deviceInfo) => {
  try {
    console.log(`禁用远程控制: ${deviceInfo.name}`);
    
    // 发送禁用远程控制指令给Android设备
    networkCommunication.sendMessageToDevice(deviceInfo.deviceId, {
      type: 'command',
      command: 'DISABLE_REMOTE_CONTROL'
    });
    
    return { success: true, message: '远程控制已禁用' };
    
  } catch (error) {
    console.error('❌ 禁用远程控制失败:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('send-control-event', (event, eventData) => {
  try {
    // 转发控制事件给Android设备
    networkCommunication.sendMessageToDevice(eventData.deviceId || 'default', {
      type: 'control_event',
      data: eventData.data
    });
    
    return { success: true };
    
  } catch (error) {
    console.error('❌ 发送控制事件失败:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('get-control-status', (event, deviceId) => {
  try {
    const connection = networkCommunication.getConnection(deviceId);
    if (!connection) {
      return { controlEnabled: false, device: null };
    }
    
    return {
      controlEnabled: connection.controlEnabled || false,
      device: connection.deviceInfo,
      lastControlTime: connection.lastControlTime || null
    };
    
  } catch (error) {
    console.error('❌ 获取控制状态失败:', error);
    return { controlEnabled: false, error: error.message };
  }
});

// 网络连接相关的IPC
ipcMain.handle('connect-to-device', async (event, deviceInfo) => {
  try {
    const connection = await networkCommunication.connectToDevice(deviceInfo);
    console.log(`✅ 成功连接到设备: ${deviceInfo.name}`);
    return {
      success: true,
      connectionId: connection.id,
      connection: connection
    };
  } catch (error) {
    console.error('❌ 连接设备失败:', error);
    return {
      success: false,
      error: error.message
    };
  }
});

ipcMain.handle('disconnect-from-device', async (event, connectionId) => {
  try {
    const success = networkCommunication.disconnectFromDevice(connectionId);
    if (success) {
      console.log(`✅ 已断开设备连接: ${connectionId}`);
    }
    return { success };
  } catch (error) {
    console.error('❌ 断开设备连接失败:', error);
    return {
      success: false,
      error: error.message
    };
  }
});

ipcMain.handle('get-connections', () => {
  return networkCommunication.getAllConnections();
});

ipcMain.handle('get-active-connections', () => {
  return networkCommunication.getActiveConnections();
});

ipcMain.handle('send-message', async (event, connectionId, message) => {
  try {
    const success = networkCommunication.sendMessage(connectionId, message);
    return { success };
  } catch (error) {
    console.error('❌ 发送消息失败:', error);
    return {
      success: false,
      error: error.message
    };
  }
});

ipcMain.handle('get-network-stats', () => {
  return networkCommunication.getNetworkStats();
});

// 通知相关的IPC
ipcMain.handle('show-notification', (event, title, body) => {
  // 显示系统通知
  new Notification({
    title: title,
    body: body
  }).show();
});

// 应用关闭前的清理工作
app.on('before-quit', () => {
  console.log('🛑 应用正在关闭，执行清理工作...');
  
  // 停止设备发现
  try {
    deviceDiscovery.stopDeviceCleanup();
    deviceDiscovery.stopDiscovery();
    console.log('✅ 设备发现已停止');
  } catch (error) {
    console.error('❌ 停止设备发现时出错:', error);
  }
  
  // 销毁网络通信模块
  try {
    networkCommunication.destroy();
    console.log('✅ 网络通信模块已销毁');
  } catch (error) {
    console.error('❌ 销毁网络通信模块时出错:', error);
  }
  
  // 停止文件传输清理任务
  try {
    fileTransfer.stopCleanupTask();
    console.log('✅ 文件传输清理任务已停止');
  } catch (error) {
    console.error('❌ 停止文件传输清理任务时出错:', error);
  }
});
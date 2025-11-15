#!/usr/bin/env node

// Windows-Android Connect 应用启动器
// 这是一个简化版本，用于在没有Electron的情况下测试核心功能

console.log('🚀 启动 Windows-Android Connect 应用');
console.log('='.repeat(50));

// 模拟Electron API
global.electron = {
  app: {
    isReady: true,
    on: (event, callback) => console.log(`[模拟] 监听 ${event} 事件`),
    quit: () => console.log('[模拟] 退出应用')
  },
  BrowserWindow: class {
    constructor(options) {
      console.log(`[模拟] 创建窗口: ${options.width}x${options.height}`);
      this.loadFile = (file) => console.log(`[模拟] 加载文件: ${file}`);
      this.show = () => console.log('[模拟] 显示窗口');
      this.webContents = {
        openDevTools: () => console.log('[模拟] 打开开发者工具')
      };
    }
  },
  dialog: {
    showOpenDialog: () => Promise.resolve({ filePaths: ['./test-file.txt'] }),
    showSaveDialog: () => Promise.resolve({ filePath: './saved-file.txt' }),
    showMessageBox: () => Promise.resolve({ response: 0 })
  },
  shell: {
    openExternal: (url) => console.log(`[模拟] 打开外部链接: ${url}`)
  },
  ipcMain: {
    handle: (channel, handler) => {
      console.log(`[模拟] 注册IPC处理程序: ${channel}`);
      // 模拟异步处理
      process.on(channel, (event, ...args) => {
        console.log(`[模拟] 处理IPC调用: ${channel}`);
      });
    }
  }
};

const DeviceDiscovery = require('./device-discovery.js');
const FileTransfer = require('./file-transfer.js');
const NetworkCommunication = require('./network-communication.js');

async function startApp() {
  try {
    console.log('📱 启动设备发现系统...');
    const deviceDiscovery = new DeviceDiscovery();
    await deviceDiscovery.startDiscovery();
    
    console.log('📁 启动文件传输系统...');
    const fileTransfer = new FileTransfer();
    await fileTransfer.initialize();
    
    console.log('🌐 启动网络通信系统...');
    const networkCommunication = new NetworkCommunication();
    await networkCommunication.start();
    
    console.log('✅ 核心系统启动完成！');
    console.log('');
    console.log('🎯 当前状态:');
    console.log(`   • 设备发现: 活跃 (端口: ${deviceDiscovery.discoveryPort})`);
    console.log(`   • 文件传输: 活跃`);
    console.log(`   • 网络通信: 活跃`);
    console.log('');
    console.log('⚡ 可以开始测试功能模块...');
    
    // 保持应用运行
    console.log('');
    console.log('💡 提示: 这是演示版本，实际运行时需要Electron');
    console.log('💡 要运行完整版本，请先安装Electron: npm install electron');
    console.log('💡 然后运行: npm run start');
    console.log('');
    console.log('按 Ctrl+C 退出演示...');
    
    // 等待用户中断
    process.on('SIGINT', () => {
      console.log('\n👋 关闭应用...');
      deviceDiscovery.stopDiscovery();
      process.exit(0);
    });
    
  } catch (error) {
    console.error('❌ 启动失败:', error.message);
    process.exit(1);
  }
}

startApp();
#!/usr/bin/env node

// Windows-Android Connect 服务端启动器
const NetworkCommunication = require('./network-communication.js');

console.log('🚀 启动 Windows-Android Connect 服务端...');
console.log('='.repeat(50));

// 创建网络通信实例
const networkCommunication = new NetworkCommunication();

// 启动服务器
async function startServer() {
  try {
    // 启动网络通信服务器
    await networkCommunication.startServer(8080);
    networkCommunication.startHeartbeatCheck();
    
    console.log('✅ 服务端启动成功!');
    console.log(`🌐 服务器监听端口: 8080`);
    console.log(`📅 启动时间: ${new Date().toLocaleString()}`);
    console.log('');
    console.log('💡 服务端功能:');
    console.log('   • 设备发现服务');
    console.log('   • 文件传输服务');
    console.log('   • 屏幕投屏服务');
    console.log('   • 远程控制服务');
    console.log('   • 通知同步服务');
    console.log('   • 剪贴板同步服务');
    console.log('');
    console.log('⏳ 等待客户端连接...');
    console.log('按 Ctrl+C 停止服务端...');
    
    // 处理退出信号
    process.on('SIGINT', () => {
      console.log('\n🛑 正在停止服务端...');
      networkCommunication.destroy();
      console.log('✅ 服务端已停止');
      process.exit(0);
    });
    
    process.on('SIGTERM', () => {
      console.log('\n🛑 正在停止服务端...');
      networkCommunication.destroy();
      console.log('✅ 服务端已停止');
      process.exit(0);
    });
    
  } catch (error) {
    console.error('❌ 服务端启动失败:', error);
    process.exit(1);
  }
}

// 启动服务
startServer();
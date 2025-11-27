const WindowsAndroidConnectServer = require('./src/server/core/server.js');

console.log('Starting Windows-Android Connect Server...');
console.log('==========================================');

// 启动服务器函数
async function startServer() {
  try {
    // 创建并启动服务器
    const server = new WindowsAndroidConnectServer(8928);
    await server.start();
    
    console.log('服务器启动成功!');
    console.log('服务器监听端口: 8928');
    console.log('启动时间: ' + new Date().toLocaleString());
    console.log('');
    console.log('服务器功能:');
    console.log('   - 设备发现服务');
    console.log('   - 文件传输服务');
    console.log('   - 屏幕镜像服务');
    console.log('   - 远程控制服务');
    console.log('   - 通知同步服务');
    console.log('   - 剪贴板同步服务');
    console.log('');
    console.log('等待客户端连接...');
    console.log('按 Ctrl+C 停止服务器...');
    
    // 保持服务器运行
    // 处理退出信号
    process.on('SIGINT', async () => {
      console.log('\n正在停止服务器...');
      await server.stop();
      console.log('服务器已停止');
      process.exit(0);
    });
    
    process.on('SIGTERM', async () => {
      console.log('\n正在停止服务器...');
      await server.stop();
      console.log('服务器已停止');
      process.exit(0);
    });
    
  } catch (error) {
    console.error('服务器启动失败:', error);
    process.exit(1);
  }
}

// 启动服务器
startServer();
const NetworkCommunication = require('./network-communication.js');

console.log('启动 Network Communication 服务...');

// 创建网络通信实例
const networkComm = new NetworkCommunication();

// 启动服务器
async function startServer() {
  try {
    console.log('正在启动服务器...');
    await networkComm.startServer(8826);
    
    console.log('服务器已启动');
    
    // 注册事件监听器
    networkComm.on('connection-established', (connection) => {
      console.log('新连接建立:', connection.id);
    });
    
    networkComm.on('device-authenticated', (connection) => {
      console.log('设备认证成功:', connection.deviceInfo);
    });
    
    networkComm.on('connection-closed', (connection) => {
      console.log('连接已关闭:', connection.id);
    });
    
    // 启动心跳检查
    networkComm.startHeartbeatCheck();
    
    console.log('Network Communication 服务启动成功！');
    console.log('监听端口: 8826');
    
  } catch (error) {
    console.error('服务器启动失败:', error);
    process.exit(1);
  }
}

startServer();

// 处理退出信号
process.on('SIGINT', () => {
  console.log('\n正在停止服务器...');
  networkComm.stopHeartbeatCheck();
  networkComm.stopServer();
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n正在停止服务器...');
  networkComm.stopHeartbeatCheck();
  networkComm.stopServer();
  process.exit(0);
});
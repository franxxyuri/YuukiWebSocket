const WebSocketServer = require('./websocket-server.js');

console.log('测试NetworkCommunication服务器状态...');

// 创建WebSocket服务器实例
const serverPort = parseInt(process.env.SERVER_PORT) || 8928;
const server = new WebSocketServer(serverPort);

console.log('NetworkCommunication服务器状态:');
console.log('- isServerRunning:', server.networkCommunication.isServerRunning);
console.log('- port:', server.networkCommunication.port);
console.log('- server:', server.networkCommunication.server ? '已创建' : '未创建');

// 尝试启动设备发现
console.log('\n尝试启动设备发现...');
server.startDeviceDiscovery()
  .then(result => {
    console.log('设备发现启动成功:', result);
  })
  .catch(error => {
    console.log('设备发现启动失败:', error.message);
  });
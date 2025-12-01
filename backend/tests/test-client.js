// 测试客户端连接
const net = require('net');

console.log('🔍 测试客户端连接到服务端...');

// 创建客户端连接
const client = new net.Socket();

// 使用配置的端口
const discoveryPort = parseInt(process.env.DISCOVERY_PORT) || 8190;

client.connect(discoveryPort, '127.0.0.1', () => {
  console.log('✅ 成功连接到服务端');
  
  // 发送设备信息
  const deviceInfo = {
    type: 'device_info',
    deviceInfo: {
      deviceId: 'test-client-001',
      deviceName: 'Test Client',
      platform: 'test',
      version: '1.0.0',
      ip: '127.0.0.1',
      port: discoveryPort,
      capabilities: ['test']
    }
  };
  
  client.write(JSON.stringify(deviceInfo) + '\n');
  console.log('📤 发送设备信息');
});

client.on('data', (data) => {
  console.log('📥 收到服务端响应:', data.toString());
});

client.on('close', () => {
  console.log('❌ 连接已关闭');
  process.exit(0);
});

client.on('error', (err) => {
  console.error('❌ 连接错误:', err.message);
  process.exit(1);
});

// 5秒后关闭连接
setTimeout(() => {
  console.log('⏳ 测试完成，关闭连接');
  client.end();
}, 5000);
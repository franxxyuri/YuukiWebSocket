const WebSocket = require('ws');

// 连接到服务器
const ws = new WebSocket('ws://localhost:8928');

ws.on('open', function open() {
  console.log('已连接到服务器');
  
  // 发送设备信息
  ws.send(JSON.stringify({
    type: 'device_info',
    deviceInfo: {
      deviceId: 'test-client-1',
      deviceName: 'Test Client',
      platform: 'web',
      version: '1.0.0'
    }
  }));
  
  // 发送心跳
  setInterval(() => {
    ws.send(JSON.stringify({
      type: 'heartbeat',
      timestamp: Date.now()
    }));
  }, 5000);
});

ws.on('message', function incoming(data) {
  const message = JSON.parse(data);
  console.log('收到消息:', message.type);
  
  // 处理不同类型的消息
  switch (message.type) {
    case 'connection_established':
      console.log('连接已建立，客户端ID:', message.clientId);
      break;
    case 'device_found':
      console.log('发现设备:', message.device);
      break;
    case 'android_connected':
      console.log('Android设备已连接:', message.deviceInfo);
      break;
    case 'heartbeat':
      console.log('收到心跳响应');
      break;
    default:
      console.log('收到其他消息:', message);
  }
});

ws.on('close', function close() {
  console.log('与服务器断开连接');
});

ws.on('error', function error(err) {
  console.error('WebSocket错误:', err);
});
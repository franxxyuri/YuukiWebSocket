// 简单的WebSocket客户端测试脚本
import { WebSocket } from 'ws';

// 创建WebSocket连接
const ws = new WebSocket('ws://localhost:9931');

// 连接打开时发送消息
ws.on('open', () => {
  console.log('WebSocket连接已打开');
  
  // 发送设备信息
  const deviceInfo = {
    deviceId: 'test-client-123',
    deviceName: 'Test Client',
    platform: 'web',
    version: '1.0.0',
    capabilities: ['file_transfer', 'screen_mirror', 'remote_control', 'notification', 'clipboard_sync']
  };
  
  ws.send(JSON.stringify({
    type: 'device_info',
    deviceInfo: deviceInfo
  }));
  
  // 发送测试消息
  setTimeout(() => {
    ws.send(JSON.stringify({
      type: 'test_connection',
      timestamp: Date.now(),
      test: true
    }));
  }, 1000);
});

// 接收消息
ws.on('message', (data) => {
  try {
    const message = JSON.parse(data);
    console.log('收到消息:', message.type);
    console.log('消息内容:', message);
  } catch (error) {
    console.error('解析消息失败:', error);
  }
});

// 连接关闭
ws.on('close', () => {
  console.log('WebSocket连接已关闭');
});

// 连接错误
ws.on('error', (error) => {
  console.error('WebSocket连接错误:', error);
});

// 5秒后关闭连接
setTimeout(() => {
  ws.close();
}, 5000);
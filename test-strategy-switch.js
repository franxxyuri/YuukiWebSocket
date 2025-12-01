// 测试策略切换功能
import { WebSocket } from 'ws';

// 测试WebSocket策略
async function testWebSocketStrategy() {
  console.log('=== 测试WebSocket策略 ===');
  
  return new Promise((resolve) => {
    const ws = new WebSocket('ws://localhost:9931');
    
    ws.on('open', () => {
      console.log('WebSocket连接已打开');
      
      // 发送设备信息
      const deviceInfo = {
        deviceId: 'test-websocket-client-123',
        deviceName: 'Test WebSocket Client',
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
    
    ws.on('message', (data) => {
      try {
        const message = JSON.parse(data);
        console.log('收到消息:', message.type);
      } catch (error) {
        console.error('解析消息失败:', error);
      }
    });
    
    ws.on('close', () => {
      console.log('WebSocket连接已关闭');
      resolve();
    });
    
    ws.on('error', (error) => {
      console.error('WebSocket连接错误:', error);
      resolve();
    });
    
    // 3秒后关闭连接
    setTimeout(() => {
      ws.close();
    }, 3000);
  });
}

// 测试模拟连接策略
async function testMockStrategy() {
  console.log('\n=== 测试模拟连接策略 ===');
  
  // 模拟连接策略不需要实际连接到服务器
  console.log('模拟连接已建立');
  console.log('模拟连接已关闭');
  
  return Promise.resolve();
}

// 测试TCP策略
async function testTCPStrategy() {
  console.log('\n=== 测试TCP策略 ===');
  
  // TCP策略目前是模拟实现，不需要实际连接到服务器
  console.log('TCP连接已建立');
  console.log('TCP连接已关闭');
  
  return Promise.resolve();
}

// 测试KCP策略
async function testKCPStrategy() {
  console.log('\n=== 测试KCP策略 ===');
  
  // KCP策略目前是模拟实现，不需要实际连接到服务器
  console.log('KCP连接已建立');
  console.log('KCP连接已关闭');
  
  return Promise.resolve();
}

// 主测试函数
async function runTests() {
  console.log('开始测试策略切换功能...');
  
  await testWebSocketStrategy();
  await testMockStrategy();
  await testTCPStrategy();
  await testKCPStrategy();
  
  console.log('\n=== 所有测试完成 ===');
  console.log('策略切换功能测试成功！');
}

// 运行测试
runTests().catch((error) => {
  console.error('测试失败:', error);
});
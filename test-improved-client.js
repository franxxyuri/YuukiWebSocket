const WebSocket = require('ws');

console.log('启动Windows-Android Connect测试客户端...');
console.log('========================================');

// 连接到服务器
const ws = new WebSocket('ws://localhost:8828');

ws.on('open', function open() {
  console.log('✅ 已连接到服务器');
  
  // 发送设备信息
  ws.send(JSON.stringify({
    type: 'device_info',
    deviceInfo: {
      deviceId: 'test-client-' + Date.now(),
      deviceName: 'Test Web Client',
      platform: 'web',
      version: '1.0.0',
      capabilities: ['control', 'view']
    }
  }));
  
  // 发送心跳
  setInterval(() => {
    ws.send(JSON.stringify({
      type: 'heartbeat',
      timestamp: Date.now()
    }));
  }, 10000);
  
  // 5秒后请求设备发现
  setTimeout(() => {
    console.log('🔍 请求开始设备发现...');
    ws.send(JSON.stringify({
      type: 'start_device_discovery'
    }));
  }, 5000);
  
  // 10秒后请求已发现设备列表
  setTimeout(() => {
    console.log('📋 请求已发现设备列表...');
    ws.send(JSON.stringify({
      type: 'get_discovered_devices'
    }));
  }, 10000);
});

ws.on('message', function incoming(data) {
  const message = JSON.parse(data);
  console.log('📥 收到消息:', message.type);
  
  // 处理不同类型的消息
  switch (message.type) {
    case 'connection_established':
      console.log('🔗 连接已建立，客户端ID:', message.clientId);
      break;
    case 'device_found':
      console.log('📱 发现设备:', message.device.deviceName, '(', message.device.ip, ')');
      break;
    case 'android_connected':
      console.log('🤖 Android设备已连接:', message.deviceInfo.deviceName);
      break;
    case 'android_disconnected':
      console.log('🚫 Android设备已断开连接');
      break;
    case 'device_connected':
      console.log('🔌 设备已连接:', message.deviceInfo.deviceName, '(', message.deviceInfo.platform, ')');
      break;
    case 'heartbeat':
      console.log('💓 收到心跳响应');
      break;
    case 'start_device_discovery_response':
      console.log('✅ 设备发现已启动:', message.success ? '成功' : '失败');
      break;
    case 'get_discovered_devices_response':
      console.log('📋 已发现设备列表:');
      if (message.devices && message.devices.length > 0) {
        message.devices.forEach(device => {
          console.log('   -', device.deviceName, '(', device.ip, ')');
        });
      } else {
        console.log('   暂无发现的设备');
      }
      break;
    default:
      console.log('📄 收到其他消息:', message.type);
  }
});

ws.on('close', function close() {
  console.log('❌ 与服务器断开连接');
});

ws.on('error', function error(err) {
  console.error('💥 WebSocket错误:', err);
});

// 处理退出信号
process.on('SIGINT', function() {
  console.log('\n👋 正在关闭测试客户端...');
  ws.close();
  process.exit(0);
});
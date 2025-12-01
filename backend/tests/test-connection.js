const WebSocket = require('ws');

console.log('尝试连接到WebSocket服务器...');

// 连接到原生WebSocket服务器
// 从环境变量读取端口配置，或使用默认值
const serverPort = parseInt(process.env.SERVER_PORT) || 8928;
const socket = new WebSocket(`ws://localhost:${serverPort}`);

socket.on('open', () => {
  console.log('✅ 成功连接到服务器！');
  
  // 发送设备信息
  socket.send(JSON.stringify({
    type: 'device_info',
    deviceInfo: {
      platform: 'nodejs',
      deviceName: 'Node.js Test Client',
      deviceId: 'nodejs-' + Date.now()
    }
  }));
  
  // 发送一个测试消息
  socket.send(JSON.stringify({
    type: 'get_discovered_devices'
  }));
});

socket.on('error', (error) => {
  console.log('❌ 连接错误:', error.message);
  console.log('错误详情:', error);
});

socket.on('close', (code, reason) => {
  console.log('❌ 连接断开:', code, reason ? reason.toString() : '未知原因');
});

socket.on('message', (data) => {
  try {
    const message = JSON.parse(data);
    console.log('收到消息:', message.type);
    
    if (message.type === 'get_discovered_devices_response') {
      console.log('设备列表响应:', message);
    }
  } catch (error) {
    console.log('消息解析错误:', error.message);
    console.log('原始消息:', data.toString());
  }
});

// 20秒后断开连接
setTimeout(() => {
  console.log('测试完成，断开连接');
  socket.close();
  process.exit(0);
}, 20000);
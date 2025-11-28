import WebSocket from 'ws';

// 创建WebSocket连接
const ws = new WebSocket('ws://localhost:8928/ws');

// 连接建立时
ws.on('open', () => {
  console.log('WebSocket连接已建立');
  
  // 发送开始设备发现请求
  const message = {
    type: 'start_device_discovery'
  };
  
  console.log('发送设备发现请求:', message);
  ws.send(JSON.stringify(message));
  
  // 发送获取已发现设备请求
  setTimeout(() => {
    const getDevicesMessage = {
      type: 'get_discovered_devices'
    };
    console.log('发送获取设备列表请求:', getDevicesMessage);
    ws.send(JSON.stringify(getDevicesMessage));
  }, 1000);
});

// 接收消息时
ws.on('message', (data) => {
  try {
    const message = JSON.parse(data);
    console.log('收到消息:', message);
    
    // 如果收到设备发现响应，关闭连接
    if (message.type === 'start_device_discovery_response' || message.type === 'get_discovered_devices_response') {
      setTimeout(() => {
        ws.close();
      }, 500);
    }
  } catch (error) {
    console.error('解析消息失败:', error);
  }
});

// 连接关闭时
ws.on('close', () => {
  console.log('WebSocket连接已关闭');
});

// 连接错误时
ws.on('error', (error) => {
  console.error('WebSocket连接错误:', error);
});

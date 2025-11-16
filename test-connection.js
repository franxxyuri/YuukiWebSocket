const io = require('socket.io-client');

console.log('尝试连接到WebSocket服务器...');

// 连接到WebSocket服务器
const socket = io('http://localhost:8828', {
  transports: ['websocket', 'polling'], // 尝试多种传输方式
  timeout: 10000, // 10秒超时
  withCredentials: true,
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

socket.on('connect', () => {
  console.log('✅ 成功连接到服务器！');
  console.log('Socket ID:', socket.id);
  
  // 发送一个测试消息
  socket.emit('get_discovered_devices', (response) => {
    console.log('设备列表响应:', response);
  });
});

socket.on('connect_error', (error) => {
  console.log('❌ 连接错误:', error.message);
  console.log('错误详情:', error);
});

socket.on('disconnect', (reason) => {
  console.log('❌ 连接断开:', reason);
});

socket.on('error', (error) => {
  console.log('❌ Socket错误:', error);
});

// 20秒后断开连接
setTimeout(() => {
  console.log('测试完成，断开连接');
  socket.disconnect();
  process.exit(0);
}, 20000);
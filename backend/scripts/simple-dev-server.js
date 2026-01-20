/**
 * 简化的开发服务器
 * 用于快速开发和测试
 */

import express from 'express';
import http from 'http';
import cors from 'cors';
import { WebSocketServer } from 'ws';

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

const PORT = process.env.PORT || 9000;
const HOST = process.env.HOST || '127.0.0.1';

// 中间件
app.use(cors());
app.use(express.json());
app.use(express.static('frontend/dist'));

// 健康检查端点
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// API 端点示例
app.get('/api/devices', (req, res) => {
  res.json({
    devices: [
      {
        id: 'device-1',
        name: 'Android Device',
        type: 'android',
        status: 'connected'
      }
    ]
  });
});

// WebSocket 连接处理
wss.on('connection', (ws) => {
  console.log('✅ 客户端已连接');

  ws.on('message', (message) => {
    console.log('📨 收到消息:', message.toString());
    
    // 回显消息
    ws.send(JSON.stringify({
      type: 'echo',
      data: message.toString(),
      timestamp: new Date().toISOString()
    }));
  });

  ws.on('close', () => {
    console.log('❌ 客户端已断开连接');
  });

  ws.on('error', (error) => {
    console.error('⚠️ WebSocket 错误:', error.message);
  });

  // 发送欢迎消息
  ws.send(JSON.stringify({
    type: 'welcome',
    message: 'Connected to Windows-Android Connect Server',
    timestamp: new Date().toISOString()
  }));
});

// 错误处理
app.use((err, req, res, next) => {
  console.error('❌ 错误:', err);
  res.status(500).json({
    error: err.message,
    timestamp: new Date().toISOString()
  });
});

// 启动服务器
server.listen(PORT, HOST, () => {
  console.log('');
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║     Windows-Android Connect 开发服务器已启动              ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log('');
  console.log(`🖥️  服务器地址: http://${HOST}:${PORT}`);
  console.log(`📡 WebSocket: ws://${HOST}:${PORT}`);
  console.log(`🏥 健康检查: http://${HOST}:${PORT}/api/health`);
  console.log('');
  console.log('按 Ctrl+C 停止服务器');
  console.log('');
});

// 优雅关闭
process.on('SIGINT', () => {
  console.log('\n\n⏹️  正在关闭服务器...');
  server.close(() => {
    console.log('✅ 服务器已关闭');
    process.exit(0);
  });
});

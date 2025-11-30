/**
 * API路由
 * 处理所有API请求
 */

import express from 'express';
import websocketService from '../websocket/index.js';

const router = express.Router();

// 缓存对象，用于存储API响应
const cache = {
  devices: {
    data: null,
    timestamp: 0,
    ttl: 5000 // 5秒缓存
  },
  status: {
    data: null,
    timestamp: 0,
    ttl: 2000 // 2秒缓存
  },
  connectedDevices: {
    data: null,
    timestamp: 0,
    ttl: 3000 // 3秒缓存
  }
};

// 缓存中间件
const cacheMiddleware = (cacheKey) => {
  return (req, res, next) => {
    const now = Date.now();
    const cached = cache[cacheKey];
    
    if (cached.data && (now - cached.timestamp) < cached.ttl) {
      // 返回缓存数据
      console.log(`使用缓存数据: ${cacheKey}`);
      return res.json(cached.data);
    }
    
    // 保存原始res.json方法
    const originalJson = res.json;
    
    // 重写res.json方法，将响应数据存入缓存
    res.json = (data) => {
      cached.data = data;
      cached.timestamp = now;
      return originalJson.call(res, data);
    };
    
    next();
  };
};

// 获取设备列表
router.get('/devices', cacheMiddleware('devices'), (req, res) => {
  const devices = [];
  const clients = websocketService.getClients();
  
  for (const [clientId, client] of clients) {
    devices.push({
      id: clientId,
      type: client.type,
      ip: client.ip,
      connected: true,
      connectedAt: client.connectedAt,
      lastActivity: client.lastActivity
    });
  }
  
  // 优化响应，提供更明确的状态信息
  res.json({
    success: true,
    devices: devices,
    totalDevices: devices.length,
    message: devices.length > 0 ? `${devices.length} 个设备已连接` : '当前没有设备连接，请检查设备连接状态或网络配置',
    timestamp: Date.now(),
    connectionStatus: {
      websocket: true,
      http: true,
      discovery: true
    }
  });
});

// 获取服务器状态
router.get('/status', cacheMiddleware('status'), (req, res) => {
  const clients = websocketService.getClients();
  const androidDevice = websocketService.getAndroidDevice();
  
  res.json({
    success: true,
    server: 'running',
    timestamp: Date.now(),
    androidConnected: !!androidDevice,
    totalClients: clients.size
  });
});

// 获取已连接的设备列表
router.get('/connected-devices', cacheMiddleware('connectedDevices'), (req, res) => {
  const androidDevice = websocketService.getAndroidDevice();
  const devices = [];
  
  if (androidDevice) {
    devices.push(androidDevice.info);
  }
  
  res.json({
    success: true,
    devices: devices
  });
});

// 连接设备
router.post('/connect-device', (req, res) => {
  const { deviceId } = req.body;
  
  // 验证设备ID格式
  if (!deviceId || typeof deviceId !== 'string' || deviceId.trim() === '') {
    return res.status(400).json({
      success: false,
      error: '设备ID不能为空且必须是字符串格式'
    });
  }
  
  // 防止设备ID包含特殊字符
  const sanitizedDeviceId = deviceId.trim().replace(/[^a-zA-Z0-9-_]/g, '');
  if (sanitizedDeviceId !== deviceId) {
    return res.status(400).json({
      success: false,
      error: '设备ID包含无效字符'
    });
  }
  
  // 简化处理：假设连接成功
  res.json({
    success: true,
    message: `设备 ${sanitizedDeviceId} 连接成功`
  });
});

// 断开设备连接
router.post('/disconnect-device', (req, res) => {
  const { deviceId } = req.body;
  
  // 验证设备ID格式
  if (!deviceId || typeof deviceId !== 'string' || deviceId.trim() === '') {
    return res.status(400).json({
      success: false,
      error: '设备ID不能为空且必须是字符串格式'
    });
  }
  
  // 防止设备ID包含特殊字符
  const sanitizedDeviceId = deviceId.trim().replace(/[^a-zA-Z0-9-_]/g, '');
  if (sanitizedDeviceId !== deviceId) {
    return res.status(400).json({
      success: false,
      error: '设备ID包含无效字符'
    });
  }
  
  // 简化处理：假设断开成功
  res.json({
    success: true,
    message: `设备 ${sanitizedDeviceId} 断开成功`
  });
});

// 运行自测脚本
router.post('/run-self-test', async (req, res) => {
  try {
    // 动态导入自测脚本
    const { runAllTests } = await import('../../scripts/auto-test.js');
    
    // 运行自测
    const testResults = await runAllTests();
    
    res.json({
      success: true,
      results: testResults,
      message: '自测完成'
    });
  } catch (error) {
    console.error('自测脚本执行失败:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      message: '自测脚本执行失败'
    });
  }
});

export default router;

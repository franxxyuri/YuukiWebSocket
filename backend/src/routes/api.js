/**
 * API路由
 * 处理所有API请求
 */

import express from 'express';
import websocketService from '../websocket/index.js';
import { configManager } from '../../config/config.mjs';
import { mockSelfTestService, mockDataGenerator } from '../utils/mock-components.js';
import validate, { validationRules } from '../middleware/inputValidator.js';

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
router.post('/connect-device', validate({
  deviceId: validationRules.deviceId
}), (req, res) => {
  const { deviceId } = req.body;
  
  // 简化处理：假设连接成功
  res.json({
    success: true,
    message: `设备 ${deviceId} 连接成功`
  });
});

// 断开设备连接
router.post('/disconnect-device', validate({
  deviceId: validationRules.deviceId
}), (req, res) => {
  const { deviceId } = req.body;
  
  // 简化处理：假设断开成功
  res.json({
    success: true,
    message: `设备 ${deviceId} 断开成功`
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

// 配置管理API

// 获取当前配置
router.get('/config', (req, res) => {
  try {
    const config = configManager.get();
    res.json({
      success: true,
      config: config,
      version: configManager.getVersion(),
      timestamp: Date.now()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      message: '获取配置失败'
    });
  }
});

// 获取特定路径的配置
router.get('/config/:path', (req, res) => {
  try {
    const { path } = req.params;
    const configValue = configManager.get(path);
    
    if (configValue === undefined) {
      return res.status(404).json({
        success: false,
        message: `配置路径 ${path} 不存在`
      });
    }
    
    res.json({
      success: true,
      path: path,
      value: configValue,
      timestamp: Date.now()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      message: '获取配置失败'
    });
  }
});

// 更新配置
router.put('/config', (req, res) => {
  try {
    const newConfig = req.body;
    
    // 验证配置
    if (!configManager.validateConfig(newConfig)) {
      return res.status(400).json({
        success: false,
        message: '配置验证失败'
      });
    }
    
    // 更新配置
    const result = configManager.saveConfig(newConfig);
    
    if (result) {
      res.json({
        success: true,
        message: '配置更新成功',
        config: configManager.get(),
        timestamp: Date.now()
      });
    } else {
      res.status(500).json({
        success: false,
        message: '配置更新失败'
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      message: '更新配置失败'
    });
  }
});

// 更新特定路径的配置
router.put('/config/:path', (req, res) => {
  try {
    const { path } = req.params;
    const value = req.body.value;
    
    // 更新配置
    const result = configManager.set(path, value);
    
    if (result) {
      res.json({
        success: true,
        message: `配置路径 ${path} 更新成功`,
        path: path,
        value: value,
        timestamp: Date.now()
      });
    } else {
      res.status(500).json({
        success: false,
        message: `配置路径 ${path} 更新失败`
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      message: '更新配置失败'
    });
  }
});

// 重置配置到默认值
router.post('/config/reset', (req, res) => {
  try {
    const result = configManager.resetToDefaults();
    
    if (result) {
      res.json({
        success: true,
        message: '配置已重置为默认值',
        config: configManager.get(),
        timestamp: Date.now()
      });
    } else {
      res.status(500).json({
        success: false,
        message: '配置重置失败'
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      message: '重置配置失败'
    });
  }
});

// 获取配置版本
router.get('/config/version', (req, res) => {
  try {
    res.json({
      success: true,
      version: configManager.getVersion(),
      timestamp: Date.now()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      message: '获取配置版本失败'
    });
  }
});

// 验证配置
router.post('/config/validate', (req, res) => {
  try {
    const configToValidate = req.body;
    const isValid = configManager.validateConfig(configToValidate);
    
    res.json({
      success: true,
      isValid: isValid,
      message: isValid ? '配置验证通过' : '配置验证失败',
      timestamp: Date.now()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      message: '验证配置失败'
    });
  }
});

// Mock自测API

// 运行模拟自测
router.post('/mock/run-self-test', async (req, res) => {
  try {
    const options = req.body || {};
    const result = await mockSelfTestService.runMockSelfTest(options);
    
    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      message: '运行模拟自测失败'
    });
  }
});

// 生成模拟设备
router.post('/mock/generate-devices', (req, res) => {
  try {
    const count = req.body.count || 5;
    const devices = mockSelfTestService.generateDevices(count);
    
    res.json({
      success: true,
      count: count,
      devices: devices,
      timestamp: Date.now()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      message: '生成模拟设备失败'
    });
  }
});

// 生成模拟客户端
router.post('/mock/generate-clients', (req, res) => {
  try {
    const count = req.body.count || 5;
    const clients = mockSelfTestService.generateClients(count);
    
    res.json({
      success: true,
      count: count,
      clients: clients,
      timestamp: Date.now()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      message: '生成模拟客户端失败'
    });
  }
});

// 生成模拟消息
router.post('/mock/generate-messages', (req, res) => {
  try {
    const count = req.body.count || 20;
    const messages = mockSelfTestService.generateMessages(count);
    
    res.json({
      success: true,
      count: count,
      messages: messages,
      timestamp: Date.now()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      message: '生成模拟消息失败'
    });
  }
});

// 模拟设备连接
router.post('/mock/simulate-device-connection', (req, res) => {
  try {
    const deviceInfo = req.body || {};
    const device = mockSelfTestService.simulateDeviceConnection(deviceInfo);
    
    res.json({
      success: true,
      device: device,
      message: '设备连接模拟成功',
      timestamp: Date.now()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      message: '模拟设备连接失败'
    });
  }
});

// 模拟设备断开连接
router.post('/mock/simulate-device-disconnection', (req, res) => {
  try {
    const { deviceId } = req.body;
    if (!deviceId) {
      return res.status(400).json({
        success: false,
        message: '设备ID不能为空'
      });
    }
    
    const device = mockSelfTestService.simulateDeviceDisconnection(deviceId);
    
    if (device) {
      res.json({
        success: true,
        device: device,
        message: '设备断开连接模拟成功',
        timestamp: Date.now()
      });
    } else {
      res.status(404).json({
        success: false,
        message: `未找到设备ID为 ${deviceId} 的设备`
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      message: '模拟设备断开连接失败'
    });
  }
});

// 模拟设备发现
router.post('/mock/simulate-device-discovery', (req, res) => {
  try {
    const count = req.body.count || 3;
    const discoveredDevices = mockSelfTestService.simulateDeviceDiscovery(count);
    
    res.json({
      success: true,
      count: count,
      devices: discoveredDevices,
      message: '设备发现模拟成功',
      timestamp: Date.now()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      message: '模拟设备发现失败'
    });
  }
});

// 模拟错误场景
router.post('/mock/simulate-error', (req, res) => {
  try {
    const { errorType } = req.body;
    const result = mockSelfTestService.simulateErrorScenario(errorType);
    
    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      message: '模拟错误场景失败'
    });
  }
});

// 模拟高负载场景
router.post('/mock/simulate-high-load', (req, res) => {
  try {
    const options = req.body || {};
    const result = mockSelfTestService.simulateHighLoad(options);
    
    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      message: '模拟高负载场景失败'
    });
  }
});

// 获取模拟状态
router.get('/mock/status', (req, res) => {
  try {
    const status = mockSelfTestService.getMockStatus();
    
    res.json({
      success: true,
      status: status,
      timestamp: Date.now()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      message: '获取模拟状态失败'
    });
  }
});

// 重置模拟数据
router.post('/mock/reset', (req, res) => {
  try {
    const result = mockSelfTestService.reset();
    
    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      message: '重置模拟数据失败'
    });
  }
});

// 生成随机数据
router.post('/mock/generate-random', (req, res) => {
  try {
    const { type, count } = req.body;
    
    let result;
    switch (type) {
      case 'device':
        result = mockDataGenerator.generateDeviceInfo();
        break;
      case 'client':
        result = mockDataGenerator.generateClientInfo();
        break;
      case 'message':
        result = mockDataGenerator.generateMessage();
        break;
      case 'error':
        result = mockDataGenerator.generateErrorInfo();
        break;
      case 'test':
        result = mockDataGenerator.generateTestResult();
        break;
      case 'config':
        result = mockDataGenerator.generateConfig();
        break;
      case 'status':
        result = mockDataGenerator.generateSystemStatus();
        break;
      case 'file':
        result = mockDataGenerator.generateFileInfo();
        break;
      default:
        return res.status(400).json({
          success: false,
          message: `不支持的随机数据类型: ${type}`
        });
    }
    
    res.json({
      success: true,
      type: type,
      data: result,
      timestamp: Date.now()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      message: '生成随机数据失败'
    });
  }
});

export default router;

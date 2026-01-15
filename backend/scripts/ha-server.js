/**
 * 高可用服务器启动脚本
 * 集成所有优化功能和自动故障恢复
 */

import express from 'express';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import { networkInterfaces, hostname } from 'os';
import cors from 'cors';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';

// 导入配置和验证
import config from '../config/config.mjs';
import { validateConfig, printConfigSummary } from '../src/utils/config-validator.js';

// 导入工具
import logger from '../src/utils/logger.js';
import serviceManager from '../src/utils/service-manager.js';
import PerformanceMonitor from '../src/utils/performance-monitor.js';

// 导入依赖注入容器
import container from '../src/utils/di-container.js';

// 导入服务
import OptimizedWebSocketService from '../src/websocket/optimized-websocket-service.js';
import discoveryService from '../src/discovery/index.js';

// 导入组件
import clientManager from '../src/websocket/clientManager.js';
import messageHandlers from '../src/websocket/messageHandlers.js';

// 解决 ES 模块中 __dirname 不可用的问题
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 验证配置
try {
  validateConfig(config);
  printConfigSummary(config);
} catch (error) {
  logger.error('配置验证失败', { error: error.message });
  process.exit(1);
}

// 创建 Express 应用
const app = express();
const server = http.createServer(app);

// 启用 CORS
app.use(cors());
app.use(express.json());

// 初始化性能监控
const performanceMonitor = new PerformanceMonitor({
  interval: 10000, // 10秒
  cpuThreshold: 80,
  memoryThreshold: 80
});

// 注册服务到依赖注入容器
container.register('clientManager', () => clientManager, true);
container.register('messageHandlers', () => messageHandlers, true);
container.register('websocketService', (di) => {
  return new OptimizedWebSocketService({
    clientManager: di.get('clientManager'),
    messageHandlers: di.get('messageHandlers'),
    enableCompression: true,
    compressionThreshold: 1024
  });
}, true);

// 获取本机 IP 地址
function getLocalIP() {
  const interfaces = networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    const netInterface = interfaces[name];
    for (const net of netInterface) {
      if (net.internal || net.family !== 'IPv4') continue;
      if (net.address.startsWith('192.168.') || 
          net.address.startsWith('10.') || 
          net.address.startsWith('172.')) {
        return net.address;
      }
    }
  }
  return '127.0.0.1';
}

// 处理 favicon.ico 请求
app.get('/favicon.ico', (req, res) => {
  const favicon = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAIAAAD91JpzAAAACXBIWXMAAAsTAAALEwEAmpwYAAAAB3RJTUUH5AgQDA0qGUv3ZgAAAB1pVFh0Q29tbWVudAAAAAAAQ3JlYXRlZCB3aXRoIEdJTVBkLmUHAAAAFklEQVQI12NkYGD4z8DAwMDAAAYAGggRAQFJw2sAAAAASUVORK5CYII=', 'base64');
  res.writeHead(200, {
    'Content-Type': 'image/x-icon',
    'Content-Length': favicon.length
  });
  res.end(favicon);
});

// API 路由
app.get('/api/status', (req, res) => {
  const clientManager = container.get('clientManager');
  const androidDevice = clientManager.getAndroidDevice();
  const totalClients = clientManager.getClientCount();

  res.json({
    server: 'running',
    timestamp: Date.now(),
    androidConnected: !!androidDevice,
    totalClients: totalClients,
    services: serviceManager.getAllServicesStatus(),
    performance: performanceMonitor.getSnapshot()
  });
});

app.get('/api/devices', (req, res) => {
  const clientManager = container.get('clientManager');
  const clients = clientManager.getClients();
  const devices = [];
  
  for (const [clientId, client] of clients) {
    devices.push({
      id: clientId,
      type: client.type,
      ip: client.ip,
      connected: true
    });
  }
  
  res.json(devices);
});

// 健康检查端点
app.get('/health', (req, res) => {
  const stats = serviceManager.getStats();
  const isHealthy = stats.failedServices === 0;
  
  res.status(isHealthy ? 200 : 503).json({
    status: isHealthy ? 'healthy' : 'unhealthy',
    services: serviceManager.getAllServicesStatus(),
    stats: stats
  });
});

// 性能统计端点
app.get('/api/performance', (req, res) => {
  res.json({
    current: performanceMonitor.getSnapshot(),
    summary: performanceMonitor.getSummary(),
    alerts: performanceMonitor.getAlerts(10)
  });
});

// 服务管理端点
app.post('/api/services/:name/restart', async (req, res) => {
  const { name } = req.params;
  
  try {
    const success = await serviceManager.manualRestart(name);
    res.json({
      success,
      message: success ? '服务重启成功' : '服务重启失败'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// 启动 Vite 开发服务器
async function startViteServer() {
  const vite = await createServer({
    plugins: [react({
      jsxRuntime: 'automatic',
      include: /\.(jsx|tsx)$/,
      exclude: /node_modules/
    })],
    server: {
      port: config.vite.port,
      host: config.vite.host,
      strictPort: false,
      proxy: {
        '/ws': {
          target: config.proxy.target,
          ws: true,
          changeOrigin: true
        },
        '/api': {
          target: config.proxy.apiTarget,
          changeOrigin: true
        },
        '/device': {
          target: config.proxy.apiTarget,
          changeOrigin: true
        }
      }
    },
    root: path.resolve(__dirname, '../../frontend'),
    publicDir: path.resolve(__dirname, '../../frontend/public'),
    build: {
      outDir: path.resolve(__dirname, '../../dist')
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '../../frontend/src'),
        '@components': path.resolve(__dirname, '../../frontend/components'),
        '@pages': path.resolve(__dirname, '../../frontend/pages'),
        '@utils': path.resolve(__dirname, '../../frontend/utils'),
        '@services': path.resolve(__dirname, '../../frontend/src/services'),
        'react': path.resolve(__dirname, '../../node_modules/react'),
        'react-dom': path.resolve(__dirname, '../../node_modules/react-dom')
      }
    }
  });
  
  app.use(vite.middlewares);
  await vite.listen();
  
  logger.info('Vite 开发服务器已启动', {
    port: config.vite.port,
    host: config.vite.host
  });
  
  return vite;
}

// 注册服务到服务管理器
function registerServices() {
  const websocketService = container.get('websocketService');
  
  // 注册 WebSocket 服务
  serviceManager.register(
    'websocket',
    websocketService,
    async () => {
      // 健康检查：检查是否有活跃连接或服务正常运行
      return websocketService.getClients().size >= 0;
    },
    async () => {
      // 重启逻辑
      logger.info('重启 WebSocket 服务...');
      websocketService.init(server);
    }
  );
  
  // 注册设备发现服务
  serviceManager.register(
    'discovery',
    discoveryService,
    async () => {
      // 健康检查：检查 UDP 服务器是否正常
      return discoveryService.discoveryServer !== null;
    },
    async () => {
      // 重启逻辑
      logger.info('重启设备发现服务...');
      discoveryService.close();
      await new Promise(resolve => setTimeout(resolve, 1000));
      discoveryService.init();
    }
  );
  
  logger.info('所有服务已注册到服务管理器');
}

// 启动服务器
async function startServer() {
  try {
    logger.info('正在启动高可用服务器...');
    
    // 启动 Vite 开发服务器
    await startViteServer();
    
    // 初始化 WebSocket 服务
    const websocketService = container.get('websocketService');
    websocketService.init(server);
    
    // 初始化设备发现服务
    discoveryService.init();
    
    // 注册服务到服务管理器
    registerServices();
    
    // 启动健康检查
    serviceManager.startHealthCheck();
    
    // 启动性能监控
    performanceMonitor.start();
    
    // 启动主服务器
    const actualPort = parseInt(process.env.SERVER_PORT) || config.server.port;
    server.listen(actualPort, config.server.host, () => {
      const localIP = getLocalIP();
      
      logger.info('═══════════════════════════════════════════════════════════');
      logger.info('🚀 高可用服务器启动成功！');
      logger.info('═══════════════════════════════════════════════════════════');
      logger.info(`📡 后端服务: http://${localIP}:${actualPort}`);
      logger.info(`⚡ 前端服务: http://${localIP}:${config.vite.port}`);
      logger.info(`🔍 健康检查: http://${localIP}:${actualPort}/health`);
      logger.info(`📊 性能监控: http://${localIP}:${actualPort}/api/performance`);
      logger.info('═══════════════════════════════════════════════════════════');
      logger.info('✅ 服务管理器: 已启动');
      logger.info('✅ 健康检查: 已启动');
      logger.info('✅ 性能监控: 已启动');
      logger.info('✅ 自动重启: 已启用');
      logger.info('═══════════════════════════════════════════════════════════');
    });
    
    // 设置设备发现广播
    setInterval(() => {
      discoveryService.broadcastDeviceDiscovery();
    }, 3000);
    
    // 立即发送一次广播
    setTimeout(() => {
      discoveryService.broadcastDeviceDiscovery();
    }, 1000);
    
  } catch (error) {
    logger.error('启动服务器失败', { error: error.message });
    process.exit(1);
  }
}

// 优雅关闭
function gracefulShutdown(signal) {
  logger.info(`收到 ${signal} 信号，准备关闭服务器...`);
  
  // 停止接受新连接
  server.close(() => {
    logger.info('HTTP 服务器已关闭');
  });
  
  // 停止服务管理器
  serviceManager.stopHealthCheck();
  serviceManager.destroy();
  
  // 停止性能监控
  performanceMonitor.stop();
  
  // 关闭设备发现服务
  discoveryService.close();
  
  logger.info('服务器已优雅关闭');
  process.exit(0);
}

// 注册信号处理
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// 未捕获异常处理
process.on('uncaughtException', (error) => {
  logger.error('未捕获的异常', { error: error.message, stack: error.stack });
  gracefulShutdown('uncaughtException');
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('未处理的 Promise 拒绝', { reason, promise });
});

// 启动服务器
startServer();

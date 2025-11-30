/**
 * 设备发现服务
 * 处理UDP广播和设备发现逻辑
 */

import dgram from 'dgram';
import { hostname } from 'os';
import config from '../config/config.js';
import websocketService from '../websocket/index.js';
import clientManager from '../websocket/clientManager.js';

class DiscoveryService {
  constructor() {
    this.discoveryServer = null;
    this.broadcastInterval = null;
  }

  /**
   * 初始化设备发现服务
   */
  init() {
    try {
      // 创建UDP套接字
      this.discoveryServer = dgram.createSocket('udp4');
      
      // 配置UDP服务器
      this.configureDiscoveryServer();
      
      // 注册事件监听器
      this.registerEventListeners();
      
      // 绑定到指定端口
      this.discoveryServer.bind(config.discovery.port, () => {
        console.log('设备发现服务已成功绑定到端口:', config.discovery.port);
      });
      
      console.log('设备发现服务已初始化');
    } catch (error) {
      console.error('初始化设备发现服务失败:', error);
      // 添加自动恢复机制
      setTimeout(() => {
        console.log('尝试重新初始化设备发现服务...');
        this.init();
      }, 5000);
    }
  }

  /**
   * 配置设备发现服务器
   */
  configureDiscoveryServer() {
    // 配置套接字选项
    this.discoveryServer.setMaxListeners(10);
  }

  /**
   * 注册事件监听器
   */
  registerEventListeners() {
    // 处理监听事件
    this.discoveryServer.on('listening', this.handleListening.bind(this));
    
    // 处理消息事件
    this.discoveryServer.on('message', this.handleMessage.bind(this));
    
    // 处理错误事件
    this.discoveryServer.on('error', this.handleError.bind(this));
    
    // 处理关闭事件
    this.discoveryServer.on('close', this.handleClose.bind(this));
    
    // 处理套接字超时
    this.discoveryServer.on('timeout', this.handleTimeout.bind(this));
  }
  
  /**
   * 处理套接字超时
   */
  handleTimeout() {
    console.warn('设备发现服务套接字超时，尝试重启...');
    this.restart();
  }
  
  /**
   * 重启设备发现服务
   */
  restart() {
    try {
      this.close();
      setTimeout(() => {
        this.init();
      }, 1000);
    } catch (error) {
      console.error('重启设备发现服务失败:', error);
    }
  }

  /**
   * 处理监听事件
   */
  handleListening() {
    const address = this.discoveryServer.address();
    console.log(`设备发现服务在UDP端口 ${address.port} 上运行`);
    
    // 设置套接字选项（在套接字绑定成功后）
    this.discoveryServer.setBroadcast(true);
    this.discoveryServer.setTTL(128);
    
    // 开始定期广播设备发现信息
    this.startBroadcast();
  }

  /**
   * 处理收到的消息
   * @param {Buffer} msg - 收到的消息
   * @param {Object} rinfo - 发送者信息
   */
  handleMessage(msg, rinfo) {
    const message = msg.toString();
    console.log(`[${new Date().toISOString()}] 设备发现服务收到消息: ${message} from ${rinfo.address}:${rinfo.port}`);
    
    try {
      // 尝试解析为JSON格式
      const jsonMessage = JSON.parse(message);
      console.log(`[${new Date().toISOString()}] 成功解析JSON消息: ${JSON.stringify(jsonMessage)}`);
      
      if (jsonMessage.type === 'device_discovery') {
        if (jsonMessage.platform === 'android') {
          // 处理JSON格式的Android设备发现消息
          this.handleJsonDeviceDiscovery(jsonMessage, rinfo);
        } else {
          console.log(`[${new Date().toISOString()}] 忽略非Android设备的发现消息: ${jsonMessage.platform}`);
        }
      } else {
        console.log(`[${new Date().toISOString()}] 忽略未知类型的JSON消息: ${jsonMessage.type}`);
      }
    } catch (error) {
      console.log(`[${new Date().toISOString()}] 消息不是JSON格式，尝试处理传统格式: ${error.message}`);
      
      // 如果不是JSON格式，尝试处理传统格式
      if (message.startsWith('ANDROID_DEVICE:')) {
        this.handleAndroidDeviceDiscovery(message, rinfo);
      } else if (message.startsWith('WINDOWS_DEVICE:')) {
        console.log(`[${new Date().toISOString()}] 收到Windows设备消息，忽略处理`);
      } else {
        console.error(`[${new Date().toISOString()}] 无效的设备发现消息格式: ${message}`);
      }
    }
  }

  /**
   * 处理Android设备发现消息
   * @param {string} message - 设备发现消息
   * @param {Object} rinfo - 发送者信息
   */
  handleAndroidDeviceDiscovery(message, rinfo) {
    // 解析设备信息
    const parts = message.split(':');
    if (parts.length < 3) {
      console.error('无效的设备发现消息格式:', message);
      return;
    }
    
    const deviceInfo = {
      deviceId: parts[1],
      deviceType: 'android',
      deviceName: parts[2],
      ip: rinfo.address,
      connectionStatus: 'discovered',
      discoveryTime: Date.now(),
      platform: 'android',
      port: rinfo.port,
      lastSeen: Date.now()
    };
    
    console.log(`发现Android设备: ${deviceInfo.deviceName} (${deviceInfo.ip})`);
    
    // 向所有Web客户端广播设备信息（使用可靠传递）
    clientManager.broadcastToWebClients({
      type: 'device_discovered',
      device: deviceInfo
    }, null, true);
  }
  
  /**
   * 处理JSON格式的设备发现消息
   * @param {Object} jsonMessage - JSON格式的设备发现消息
   * @param {Object} rinfo - 发送者信息
   */
  handleJsonDeviceDiscovery(jsonMessage, rinfo) {
    const deviceInfo = {
      deviceId: jsonMessage.deviceId,
      deviceType: 'android',
      deviceName: jsonMessage.deviceName || 'Android Device',
      ip: rinfo.address,
      connectionStatus: 'discovered',
      discoveryTime: Date.now(),
      platform: 'android',
      port: rinfo.port,
      lastSeen: Date.now(),
      version: jsonMessage.version || '1.0.0',
      capabilities: jsonMessage.capabilities || []
    };
    
    console.log(`发现Android设备 (JSON): ${deviceInfo.deviceName} (${deviceInfo.ip})`);
    
    // 向所有Web客户端广播设备信息（使用可靠传递）
    clientManager.broadcastToWebClients({
      type: 'device_discovered',
      device: deviceInfo
    }, null, true);
  }

  /**
   * 处理错误事件
   * @param {Error} error - 错误对象
   */
  handleError(error) {
    console.error(`[${new Date().toISOString()}] 设备发现服务错误 - 类型: ${error.code || 'unknown'}, 消息: ${error.message}, 堆栈: ${error.stack}`);
    
    // 根据错误类型添加特定处理
    switch (error.code) {
      case 'EADDRINUSE':
        console.error(`[${new Date().toISOString()}] 端口 ${config.discovery.port} 已被占用，尝试重新绑定...`);
        this.restart();
        break;
      case 'EACCES':
        console.error(`[${new Date().toISOString()}] 没有权限绑定到端口 ${config.discovery.port}，请检查权限设置`);
        break;
      default:
        console.error(`[${new Date().toISOString()}] 设备发现服务发生未知错误`);
        break;
    }
  }

  /**
   * 处理关闭事件
   */
  handleClose() {
    console.log('设备发现服务已关闭');
    
    // 停止广播
    this.stopBroadcast();
  }

  /**
   * 开始定期广播设备发现信息
   */
  startBroadcast() {
    // 立即发送一次广播
    this.broadcastDeviceDiscovery();
    
    // 设置定期广播
    this.broadcastInterval = setInterval(() => {
      this.broadcastDeviceDiscovery();
    }, config.discovery.broadcastInterval);
  }

  /**
   * 停止定期广播设备发现信息
   */
  stopBroadcast() {
    if (this.broadcastInterval) {
      clearInterval(this.broadcastInterval);
      this.broadcastInterval = null;
    }
  }

  /**
   * 广播设备发现信息
   */
  broadcastDeviceDiscovery() {
    try {
      // 检查套接字状态
      if (!this.discoveryServer || this.discoveryServer._handle === null) {
        console.warn(`[${new Date().toISOString()}] 设备发现服务套接字已关闭，跳过广播`);
        return;
      }

      // 构建设备信息
      const deviceInfo = {
        deviceId: 'windows-pc-' + hostname(),
        deviceName: hostname(),
        platform: 'windows',
        version: '1.0.0',
        capabilities: ['file_transfer', 'screen_mirror', 'remote_control', 'notification', 'clipboard_sync']
      };

      // 构建多种格式的广播消息，提高兼容性
      const messages = [
        // 传统格式
        `WINDOWS_DEVICE:${deviceInfo.deviceId}:${deviceInfo.deviceName}:${deviceInfo.version}`,
        // JSON格式
        JSON.stringify({
          type: 'device_discovery',
          platform: 'windows',
          deviceId: deviceInfo.deviceId,
          deviceName: deviceInfo.deviceName,
          version: deviceInfo.version,
          capabilities: deviceInfo.capabilities,
          timestamp: Date.now()
        })
      ];

      // 发送多种格式的广播消息
      messages.forEach((message, index) => {
        const buffer = Buffer.from(message);
        
        // 发送到广播地址
        this.discoveryServer.send(buffer, 0, buffer.length, config.discovery.port, '255.255.255.255', (err) => {
          if (err) {
            console.error(`[${new Date().toISOString()}] 发送广播消息 ${index + 1} 失败:`, err);
            // 尝试使用回退策略
            this.fallbackBroadcast(message);
          } else {
            // 记录成功日志
            console.log(`[${new Date().toISOString()}] 成功发送广播消息 ${index + 1}:`, message.substring(0, 50) + '...');
          }
        });
      });
    } catch (error) {
      console.error(`[${new Date().toISOString()}] 广播设备发现信息时出错:`, error);
      // 尝试重启服务
      this.restart();
    }
  }
  
  /**
   * 回退广播策略
   * @param {string} message - 广播消息
   */
  fallbackBroadcast(message) {
    try {
      console.log(`[${new Date().toISOString()}] 使用回退广播策略...`);
      const buffer = Buffer.from(message);
      
      // 尝试发送到本地子网广播地址
      const localSubnetBroadcast = '192.168.1.255';
      this.discoveryServer.send(buffer, 0, buffer.length, config.discovery.port, localSubnetBroadcast, (err) => {
        if (err) {
          console.error(`[${new Date().toISOString()}] 回退广播也失败:`, err);
        } else {
          console.log(`[${new Date().toISOString()}] 回退广播成功`);
        }
      });
    } catch (error) {
      console.error(`[${new Date().toISOString()}] 回退广播策略执行失败:`, error);
    }
  }

  /**
   * 关闭设备发现服务
   */
  close() {
    // 停止广播
    this.stopBroadcast();
    
    // 关闭UDP套接字
    if (this.discoveryServer) {
      this.discoveryServer.close();
      this.discoveryServer = null;
    }
    
    console.log('设备发现服务已关闭');
  }
}

// 创建单例实例
const discoveryService = new DiscoveryService();

export default discoveryService;

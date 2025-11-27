const dgram = require('dgram');
const mdns = require('multicast-dns')();
const crypto = require('crypto');

class DeviceDiscovery {
  constructor() {
    this.devices = new Map();
    this.isDiscovering = false;
    this.broadcastInterval = null;
    this.deviceInfo = {
      deviceId: this.generateDeviceId(),
      deviceName: 'Windows-PC',
      ip: this.getLocalIP(),
      port: 8190,
      platform: 'windows',
      version: '1.0.0',
      capabilities: [
        'file_transfer',
        'screen_mirror', 
        'remote_control',
        'notification',
        'clipboard_sync'
      ]
    };
  }

  generateDeviceId() {
    return crypto.randomBytes(16).toString('hex');
  }

  getLocalIP() {
    const os = require('os');
    const networkInterfaces = os.networkInterfaces();
    
    for (const [name, nets] of Object.entries(networkInterfaces)) {
      for (const net of nets) {
        if (net.family === 'IPv4' && !net.internal) {
          return net.address;
        }
      }
    }
    return '127.0.0.1';
  }

  async startDiscovery() {
    if (this.isDiscovering) return false;
    
    this.isDiscovering = true;
    console.log('🚀 开始设备发现...');

    try {
      // 启动UDP广播
      await this.startUdpBroadcast();
      
      // 启动mDNS发现
      await this.startMdnsDiscovery();
      
      console.log('✅ 设备发现服务已启动');
      return true;
    } catch (error) {
      console.error('❌ 启动设备发现失败:', error);
      this.isDiscovering = false;
      throw error;
    }
  }

  async stopDiscovery() {
    if (!this.isDiscovering) return true;
    
    this.isDiscovering = false;
    console.log('🛑 停止设备发现...');

    try {
      // 停止UDP广播
      this.stopUdpBroadcast();
      
      // 停止mDNS发现
      this.stopMdnsDiscovery();
      
      console.log('✅ 设备发现服务已停止');
      return true;
    } catch (error) {
      console.error('❌ 停止设备发现失败:', error);
      throw error;
    }
  }

  async startUdpBroadcast() {
    return new Promise((resolve, reject) => {
      const client = dgram.createSocket({ type: 'udp4' });
      
      client.on('error', (err) => {
        console.error('UDP客户端错误:', err);
        reject(err);
      });

      client.on('message', (msg, rinfo) => {
        this.handleUdpMessage(msg, rinfo);
      });

      client.bind(() => {
        client.setBroadcast(true);
        client.setMulticastTTL(128);
        
        // 开始定期广播设备信息
        this.broadcastInterval = setInterval(() => {
          this.broadcastDeviceInfo(client);
        }, 3000);

        console.log('📡 UDP广播服务已启动');
        resolve();
      });
    });
  }

  stopUdpBroadcast() {
    if (this.broadcastInterval) {
      clearInterval(this.broadcastInterval);
      this.broadcastInterval = null;
    }
    console.log('📡 UDP广播服务已停止');
  }

  broadcastDeviceInfo(client) {
    const message = JSON.stringify({
      type: 'device_broadcast',
      device: this.deviceInfo,
      timestamp: Date.now()
    });

    const buffer = Buffer.from(message);

    // 广播到局域网
    const broadcastAddress = '255.255.255.255';
    client.send(buffer, 0, buffer.length, 8190, broadcastAddress, (err) => {
      if (err) {
        console.error('UDP广播发送失败:', err);
      }
    });
  }

  handleUdpMessage(msg, rinfo) {
    try {
      const data = JSON.parse(msg.toString());
      
      if (data.type === 'device_broadcast' && data.device) {
        this.onDeviceFound(data.device, rinfo);
      }
    } catch (error) {
      console.error('解析UDP消息失败:', error);
    }
  }

  async startMdnsDiscovery() {
    return new Promise((resolve, reject) => {
      // 监听设备响应
      mdns.on('response', (response) => {
        this.handleMdnsResponse(response);
      });

      // 发送查询请求
      mdns.query('wac-device._tcp.local', (err, answers) => {
        if (err) {
          console.warn('mDNS查询失败:', err);
        } else {
          console.log('🔍 mDNS查询已发送');
        }
      });

      // 定期发送查询
      this.mdnsQueryInterval = setInterval(() => {
        mdns.query('wac-device._tcp.local', () => {});
      }, 10000);

      console.log('🔍 mDNS发现服务已启动');
      resolve();
    });
  }

  stopMdnsDiscovery() {
    if (this.mdnsQueryInterval) {
      clearInterval(this.mdnsQueryInterval);
      this.mdnsQueryInterval = null;
    }
    console.log('🔍 mDNS发现服务已停止');
  }

  handleMdnsResponse(response) {
    response.answers.forEach((answer) => {
      if (answer.type === 'SRV' && answer.name.includes('wac-device')) {
        console.log('📱 发现mDNS设备:', answer);
        // 解析SRV记录获取设备信息
        // 这里需要根据实际协议格式进行解析
      }
    });
  }

  onDeviceFound(device, rinfo) {
    // 避免重复添加相同设备
    const deviceKey = device.deviceId || device.ip;
    
    if (!this.devices.has(deviceKey)) {
      const deviceInfo = {
        ...device,
        ip: device.ip || rinfo.address,
        lastSeen: Date.now(),
        source: 'broadcast',
        rinfo
      };

      this.devices.set(deviceKey, deviceInfo);
      
      console.log(`✅ 发现新设备: ${device.name} (${device.ip})`);
      console.log(`   设备ID: ${device.deviceId}`);
      console.log(`   平台: ${device.platform}`);
      console.log(`   版本: ${device.version}`);
      console.log(`   能力: ${device.capabilities.join(', ')}`);

      // 发送设备发现事件
      if (global.mainWindow && !global.mainWindow.isDestroyed()) {
        global.mainWindow.webContents.send('device-found', deviceInfo);
      }
    } else {
      // 更新设备最后发现时间
      const existingDevice = this.devices.get(deviceKey);
      existingDevice.lastSeen = Date.now();
    }
  }

  onDeviceLost(deviceId) {
    if (this.devices.has(deviceId)) {
      const device = this.devices.get(deviceId);
      this.devices.delete(deviceId);
      
      console.log(`❌ 设备失去连接: ${device.name} (${device.ip})`);
      
      // 发送设备丢失事件
      if (global.mainWindow && !global.mainWindow.isDestroyed()) {
        global.mainWindow.webContents.send('device-lost', { deviceId });
      }
    }
  }

  getDiscoveredDevices() {
    const devicesArray = Array.from(this.devices.values());
    
    // 按最后发现时间排序
    devicesArray.sort((a, b) => b.lastSeen - a.lastSeen);
    
    return devicesArray;
  }

  getDevice(deviceId) {
    return this.devices.get(deviceId);
  }

  isDeviceOnline(deviceId) {
    const device = this.devices.get(deviceId);
    if (!device) return false;
    
    // 检查设备是否在30秒内被看到
    const timeSinceLastSeen = Date.now() - device.lastSeen;
    return timeSinceLastSeen < 30000;
  }

  // 清理超时的设备（超过5分钟未响应）
  cleanupOfflineDevices() {
    const now = Date.now();
    const timeout = 5 * 60 * 1000; // 5分钟
    
    for (const [deviceId, device] of this.devices.entries()) {
      if (now - device.lastSeen > timeout) {
        this.onDeviceLost(deviceId);
      }
    }
  }

  // 开始设备清理任务
  startDeviceCleanup() {
    this.cleanupInterval = setInterval(() => {
      this.cleanupOfflineDevices();
    }, 60000); // 每分钟检查一次
  }

  // 停止设备清理任务
  stopDeviceCleanup() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }

  // 获取设备统计信息
  getDeviceStats() {
    const totalDevices = this.devices.size;
    const onlineDevices = Array.from(this.devices.values())
      .filter(device => this.isDeviceOnline(device.deviceId)).length;
    
    const platforms = {};
    Array.from(this.devices.values()).forEach(device => {
      const platform = device.platform || 'unknown';
      platforms[platform] = (platforms[platform] || 0) + 1;
    });

    return {
      totalDevices,
      onlineDevices,
      platforms,
      isDiscovering: this.isDiscovering
    };
  }
}

module.exports = DeviceDiscovery;
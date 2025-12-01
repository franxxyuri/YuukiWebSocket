/**
 * Windows-Android Connect 项目配置文件 (CommonJS 版本)
 * 
 * 该配置文件用于管理所有服务的端口和其他配置参数
 * 支持通过环境变量进行自定义配置
 */

const config = {
  // 主服务器配置
  server: {
    port: parseInt(process.env.SERVER_PORT) || 8928,
    host: process.env.SERVER_HOST || '0.0.0.0',
    name: 'Windows-Android Connect Server'
  },
  
  // Vite 开发服务器配置
  vite: {
    port: parseInt(process.env.VITE_PORT) || 8781,
    host: process.env.VITE_HOST || '0.0.0.0'
  },
  
  // 设备发现服务配置 (UDP)
  discovery: {
    port: parseInt(process.env.DISCOVERY_PORT) || 8190,
    broadcastInterval: parseInt(process.env.DISCOVERY_INTERVAL) || 5000 // 毫秒
  },
  
  // 调试服务器配置
  debug: {
    port: parseInt(process.env.DEBUG_PORT) || 8181
  },
  
  // 网络通信配置
  network: {
    timeout: parseInt(process.env.NETWORK_TIMEOUT) || 30000, // 30秒
    retryAttempts: parseInt(process.env.NETWORK_RETRY_ATTEMPTS) || 3,
    retryDelay: parseInt(process.env.NETWORK_RETRY_DELAY) || 1000 // 1秒
  },
  
  // 文件传输配置
  fileTransfer: {
    chunkSize: parseInt(process.env.FILE_CHUNK_SIZE) || 1024 * 1024, // 1MB
    maxFileSize: parseInt(process.env.MAX_FILE_SIZE) || 100 * 1024 * 1024 // 100MB
  },
  
  // 网络通信服务配置
  networkCommunication: {
    port: parseInt(process.env.NETWORK_COMM_PORT) || 8826
  }
};

module.exports = config;
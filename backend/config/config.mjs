/**
 * Windows-Android Connect 项目配置文件
 * 
 * 该配置文件用于管理所有服务的端口和其他配置参数
 * 支持通过环境变量进行自定义配置
 */

export default {
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
    broadcastInterval: parseInt(process.env.DISCOVERY_INTERVAL) || 5000, // 毫秒
    broadcastAddress: process.env.DISCOVERY_BROADCAST_ADDRESS || '255.255.255.255',
    localSubnetBroadcast: process.env.DISCOVERY_LOCAL_SUBNET_BROADCAST || '192.168.1.255'
  },
  
  // 调试服务器配置
  debug: {
    port: parseInt(process.env.DEBUG_PORT) || 8181
  },
  
  // WebSocket 配置
  websocket: {
    // 最大连接数
    maxConnections: parseInt(process.env.WS_MAX_CONNECTIONS) || 1000,
    // ping 心跳间隔（毫秒）
    pingInterval: parseInt(process.env.WS_PING_INTERVAL) || 30000,
    // ping 超时时间（毫秒），超过此时间未收到 pong 视为断开
    pingTimeout: parseInt(process.env.WS_PING_TIMEOUT) || 10000
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
  
  // 前端静态文件配置
  frontend: {
    rootDir: process.env.FRONTEND_ROOT_DIR || '../../frontend',
    staticPaths: {
      root: process.env.FRONTEND_STATIC_ROOT || '../../frontend',
      pages: process.env.FRONTEND_PAGES_DIR || '../../frontend/pages',
      components: process.env.FRONTEND_COMPONENTS_DIR || '../../frontend/components',
      styles: process.env.FRONTEND_STYLES_DIR || '../../frontend/styles',
      utils: process.env.FRONTEND_UTILS_DIR || '../../frontend/utils',
      tests: process.env.FRONTEND_TESTS_DIR || '../../frontend/tests',
      public: process.env.FRONTEND_PUBLIC_DIR || '../../frontend/public',
      src: process.env.FRONTEND_SRC_DIR || '../../frontend/src',
      dist: process.env.FRONTEND_DIST_DIR || '../../frontend/dist'
    },
    aliases: {
      '@': process.env.FRONTEND_ALIAS_AT || '../../frontend/src',
      '@components': process.env.FRONTEND_ALIAS_COMPONENTS || '../../frontend/components',
      '@pages': process.env.FRONTEND_ALIAS_PAGES || '../../frontend/pages',
      '@utils': process.env.FRONTEND_ALIAS_UTILS || '../../frontend/utils',
      '@hooks': process.env.FRONTEND_ALIAS_HOOKS || '../../frontend/hooks',
      '@services': process.env.FRONTEND_ALIAS_SERVICES || '../../frontend/services',
      '@store': process.env.FRONTEND_ALIAS_STORE || '../../frontend/store',
      '@types': process.env.FRONTEND_ALIAS_TYPES || '../../frontend/types'
    },
    htmlEntries: {
      main: process.env.FRONTEND_HTML_MAIN || '../../frontend/index.html',
      screen: process.env.FRONTEND_HTML_SCREEN || '../../frontend/pages/screen-stream.html',
      reactIndex: process.env.FRONTEND_HTML_REACT_INDEX || '../../frontend/pages/react-index.html',
      appIndex: process.env.FRONTEND_HTML_APP_INDEX || '../../frontend/pages/app-index.html',
      deviceManager: process.env.FRONTEND_HTML_DEVICE_MANAGER || '../../frontend/pages/device-manager.html',
      testUi: process.env.FRONTEND_HTML_TEST_UI || '../../frontend/tests/test-ui.html',
      testConnection: process.env.FRONTEND_HTML_TEST_CONNECTION || '../../frontend/tests/test-connection.html',
      testServerFunctions: process.env.FRONTEND_HTML_TEST_SERVER_FUNCTIONS || '../../frontend/tests/test-server-functions.html',
      testAndroidClient: process.env.FRONTEND_HTML_TEST_ANDROID_CLIENT || '../../frontend/tests/test-android-client.html'
    }
  },
  
  // 代理配置
  proxy: {
    target: `http://localhost:${parseInt(process.env.SERVER_PORT) || 8928}`,
    apiTarget: `http://localhost:${parseInt(process.env.SERVER_PORT) || 8928}`
  }
};
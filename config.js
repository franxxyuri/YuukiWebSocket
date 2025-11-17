// config.js - 端口和服务器配置文件
const config = {
  // 主服务端口配置
  server: {
    port: process.env.SERVER_PORT || 8828,  // 主WebSocket服务器端口
    host: process.env.SERVER_HOST || '0.0.0.0'
  },
  
  // Vite开发服务器端口配置
  vite: {
    port: process.env.VITE_PORT || 8080,    // Vite前端代理端口
    host: process.env.VITE_HOST || '0.0.0.0'
  },
  
  // 设备发现UDP端口配置
  discovery: {
    port: process.env.DISCOVERY_PORT || 8090  // UDP设备发现端口
  },
  
  // 调试和测试端口配置
  debug: {
    port: process.env.DEBUG_PORT || 8081     // 调试服务器端口
  },
  
  // 代理配置
  proxy: {
    target: process.env.PROXY_TARGET || `ws://localhost:${process.env.SERVER_PORT || 8828}`,
    apiTarget: process.env.API_TARGET || `http://localhost:${process.env.SERVER_PORT || 8828}`
  }
};

// 验证端口范围
function validatePort(port, name) {
  const portNum = parseInt(port);
  if (isNaN(portNum) || portNum < 1 || portNum > 65535) {
    console.warn(`警告: ${name} 端口 ${port} 超出有效范围 (1-65535)，使用默认值`);
    return false;
  }
  return true;
}

// 验证所有端口
Object.keys(config).forEach(category => {
  if (typeof config[category] === 'object') {
    Object.keys(config[category]).forEach(key => {
      if (key === 'port') {
        validatePort(config[category][key], `${category}.${key}`);
      } else if (key.includes('port')) {
        validatePort(config[category][key], `${category}.${key}`);
      }
    });
  }
});

module.exports = config;
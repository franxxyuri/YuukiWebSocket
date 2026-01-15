/**
 * 配置验证模块
 * 验证配置文件的完整性和正确性
 */

/**
 * 验证端口号
 */
function validatePort(port, name = 'port') {
  const portNum = parseInt(port);
  if (isNaN(portNum) || portNum < 1 || portNum > 65535) {
    throw new Error(`无效的${name}: ${port}，端口号必须在 1-65535 之间`);
  }
  return portNum;
}

/**
 * 验证主机地址
 */
function validateHost(host, name = 'host') {
  if (!host || typeof host !== 'string') {
    throw new Error(`无效的${name}: ${host}`);
  }
  
  // 允许的主机格式
  const validPatterns = [
    /^localhost$/i,
    /^0\.0\.0\.0$/,
    /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/,
    /^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/
  ];
  
  const isValid = validPatterns.some(pattern => pattern.test(host));
  if (!isValid) {
    throw new Error(`无效的${name}格式: ${host}`);
  }
  
  return host;
}

/**
 * 验证超时时间
 */
function validateTimeout(timeout, name = 'timeout') {
  const timeoutNum = parseInt(timeout);
  if (isNaN(timeoutNum) || timeoutNum < 0) {
    throw new Error(`无效的${name}: ${timeout}，必须是非负整数`);
  }
  return timeoutNum;
}

/**
 * 验证文件大小
 */
function validateFileSize(size, name = 'fileSize') {
  const sizeNum = parseInt(size);
  if (isNaN(sizeNum) || sizeNum <= 0) {
    throw new Error(`无效的${name}: ${size}，必须是正整数`);
  }
  return sizeNum;
}

/**
 * 验证服务器配置
 */
function validateServerConfig(config) {
  const errors = [];
  
  try {
    validatePort(config.port, '服务器端口');
  } catch (error) {
    errors.push(error.message);
  }
  
  try {
    validateHost(config.host, '服务器主机');
  } catch (error) {
    errors.push(error.message);
  }
  
  if (errors.length > 0) {
    throw new Error(`服务器配置验证失败:\n${errors.join('\n')}`);
  }
  
  return true;
}

/**
 * 验证 Vite 配置
 */
function validateViteConfig(config) {
  const errors = [];
  
  try {
    validatePort(config.port, 'Vite端口');
  } catch (error) {
    errors.push(error.message);
  }
  
  try {
    validateHost(config.host, 'Vite主机');
  } catch (error) {
    errors.push(error.message);
  }
  
  if (errors.length > 0) {
    throw new Error(`Vite配置验证失败:\n${errors.join('\n')}`);
  }
  
  return true;
}

/**
 * 验证设备发现配置
 */
function validateDiscoveryConfig(config) {
  const errors = [];
  
  try {
    validatePort(config.port, '设备发现端口');
  } catch (error) {
    errors.push(error.message);
  }
  
  try {
    validateTimeout(config.broadcastInterval, '广播间隔');
  } catch (error) {
    errors.push(error.message);
  }
  
  if (errors.length > 0) {
    throw new Error(`设备发现配置验证失败:\n${errors.join('\n')}`);
  }
  
  return true;
}

/**
 * 验证网络配置
 */
function validateNetworkConfig(config) {
  const errors = [];
  
  try {
    validateTimeout(config.timeout, '网络超时');
  } catch (error) {
    errors.push(error.message);
  }
  
  const retryAttempts = parseInt(config.retryAttempts);
  if (isNaN(retryAttempts) || retryAttempts < 0) {
    errors.push(`无效的重试次数: ${config.retryAttempts}`);
  }
  
  try {
    validateTimeout(config.retryDelay, '重试延迟');
  } catch (error) {
    errors.push(error.message);
  }
  
  if (errors.length > 0) {
    throw new Error(`网络配置验证失败:\n${errors.join('\n')}`);
  }
  
  return true;
}

/**
 * 验证文件传输配置
 */
function validateFileTransferConfig(config) {
  const errors = [];
  
  try {
    validateFileSize(config.chunkSize, '分块大小');
  } catch (error) {
    errors.push(error.message);
  }
  
  try {
    validateFileSize(config.maxFileSize, '最大文件大小');
  } catch (error) {
    errors.push(error.message);
  }
  
  if (config.chunkSize > config.maxFileSize) {
    errors.push('分块大小不能大于最大文件大小');
  }
  
  if (errors.length > 0) {
    throw new Error(`文件传输配置验证失败:\n${errors.join('\n')}`);
  }
  
  return true;
}

/**
 * 验证完整配置
 */
function validateConfig(config) {
  const errors = [];
  
  // 验证各个配置部分
  try {
    validateServerConfig(config.server);
  } catch (error) {
    errors.push(error.message);
  }
  
  try {
    validateViteConfig(config.vite);
  } catch (error) {
    errors.push(error.message);
  }
  
  try {
    validateDiscoveryConfig(config.discovery);
  } catch (error) {
    errors.push(error.message);
  }
  
  if (config.network) {
    try {
      validateNetworkConfig(config.network);
    } catch (error) {
      errors.push(error.message);
    }
  }
  
  if (config.fileTransfer) {
    try {
      validateFileTransferConfig(config.fileTransfer);
    } catch (error) {
      errors.push(error.message);
    }
  }
  
  // 检查端口冲突
  const ports = [
    { name: '服务器', port: config.server.port },
    { name: 'Vite', port: config.vite.port },
    { name: '设备发现', port: config.discovery.port }
  ];
  
  if (config.debug && config.debug.port) {
    ports.push({ name: '调试', port: config.debug.port });
  }
  
  const portMap = new Map();
  for (const { name, port } of ports) {
    if (portMap.has(port)) {
      errors.push(`端口冲突: ${name}端口(${port})与${portMap.get(port)}端口相同`);
    } else {
      portMap.set(port, name);
    }
  }
  
  if (errors.length > 0) {
    throw new Error(`配置验证失败:\n${errors.join('\n')}`);
  }
  
  console.log('✅ 配置验证通过');
  return true;
}

/**
 * 打印配置摘要
 */
function printConfigSummary(config) {
  console.log('\n📋 配置摘要:');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`🖥️  服务器: ${config.server.host}:${config.server.port}`);
  console.log(`⚡ Vite: ${config.vite.host}:${config.vite.port}`);
  console.log(`📡 设备发现: UDP端口 ${config.discovery.port}`);
  if (config.debug && config.debug.port) {
    console.log(`🐛 调试服务: ${config.debug.port}`);
  }
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
}

export {
  validatePort,
  validateHost,
  validateTimeout,
  validateFileSize,
  validateServerConfig,
  validateViteConfig,
  validateDiscoveryConfig,
  validateNetworkConfig,
  validateFileTransferConfig,
  validateConfig,
  printConfigSummary
};

export default validateConfig;

/**
 * 测试修复脚本
 * 验证所有修复是否正常工作
 */

import { validateConfig, printConfigSummary } from './backend/src/utils/config-validator.js';
import config from './backend/config/config.mjs';
import logger from './backend/src/utils/logger.js';

console.log('🧪 开始测试修复...\n');

// 测试 1: 配置验证
console.log('📋 测试 1: 配置验证');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
try {
  validateConfig(config);
  printConfigSummary(config);
  console.log('✅ 配置验证通过\n');
} catch (error) {
  console.error('❌ 配置验证失败:', error.message);
  process.exit(1);
}

// 测试 2: 日志系统
console.log('📝 测试 2: 日志系统');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
logger.info('这是一条信息日志');
logger.warn('这是一条警告日志');
logger.error('这是一条错误日志', { error: new Error('测试错误') });
logger.debug('这是一条调试日志');

const childLogger = logger.child('SubModule');
childLogger.info('这是子模块的日志');
console.log('✅ 日志系统正常\n');

// 测试 3: 端口配置
console.log('🔌 测试 3: 端口配置');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
const expectedPorts = {
  server: 8928,
  vite: 8781,
  discovery: 8190
};

let portTestPassed = true;

if (config.server.port !== expectedPorts.server) {
  console.error(`❌ 服务器端口错误: 期望 ${expectedPorts.server}, 实际 ${config.server.port}`);
  portTestPassed = false;
}

if (config.vite.port !== expectedPorts.vite) {
  console.error(`❌ Vite端口错误: 期望 ${expectedPorts.vite}, 实际 ${config.vite.port}`);
  portTestPassed = false;
}

if (config.discovery.port !== expectedPorts.discovery) {
  console.error(`❌ 设备发现端口错误: 期望 ${expectedPorts.discovery}, 实际 ${config.discovery.port}`);
  portTestPassed = false;
}

if (portTestPassed) {
  console.log('✅ 端口配置正确');
  console.log(`   - 服务器端口: ${config.server.port}`);
  console.log(`   - Vite端口: ${config.vite.port}`);
  console.log(`   - 设备发现端口: ${config.discovery.port}\n`);
} else {
  process.exit(1);
}

// 测试 4: 错误处理
console.log('⚠️  测试 4: 错误处理');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
try {
  // 动态导入错误处理模块
  const { AppError } = await import('./backend/src/middleware/errorHandler.js');
  
  // 创建测试错误
  const testError = new AppError('测试错误', 400);
  
  if (testError.statusCode === 400 && testError.message === '测试错误') {
    console.log('✅ AppError 类正常工作');
    console.log(`   - 错误消息: ${testError.message}`);
    console.log(`   - 状态码: ${testError.statusCode}`);
    console.log(`   - 时间戳: ${testError.timestamp}\n`);
  } else {
    console.error('❌ AppError 类异常');
    process.exit(1);
  }
} catch (error) {
  console.error('❌ 错误处理模块加载失败:', error.message);
  process.exit(1);
}

// 测试总结
console.log('🎉 所有测试通过！');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('✅ 配置验证系统正常');
console.log('✅ 日志系统正常');
console.log('✅ 端口配置正确');
console.log('✅ 错误处理模块正常');
console.log('\n🚀 项目已准备就绪，可以启动服务器了！');
console.log('\n运行以下命令启动服务器:');
console.log('  npm run dev:integrated');
console.log('  或');
console.log('  quick-start-dev.bat');

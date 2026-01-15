/**
 * 优化功能测试脚本
 * 验证所有优化模块是否正常工作
 */

console.log('🧪 开始测试优化功能...\n');

// 测试 1: 消息队列
console.log('📋 测试 1: 消息队列系统');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
try {
  const { default: MessageQueue, PRIORITY } = await import('./backend/src/utils/message-queue.js');
  
  const queue = new MessageQueue({
    batchSize: 5,
    processInterval: 10
  });
  
  // 添加测试消息
  let processed = 0;
  for (let i = 0; i < 10; i++) {
    queue.enqueue(
      { id: i, data: `test-${i}` },
      PRIORITY.NORMAL,
      async (msg) => {
        processed++;
      }
    );
  }
  
  // 等待处理
  await new Promise(resolve => setTimeout(resolve, 100));
  
  const stats = queue.getStats();
  console.log(`✅ 消息队列测试通过`);
  console.log(`   - 已处理: ${stats.processed} 条消息`);
  console.log(`   - 队列中: ${stats.totalQueued} 条消息`);
  
  queue.destroy();
  console.log();
} catch (error) {
  console.error('❌ 消息队列测试失败:', error.message);
  process.exit(1);
}

// 测试 2: 智能设备发现
console.log('📡 测试 2: 智能设备发现');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
try {
  const { default: SmartDiscovery } = await import('./backend/src/utils/smart-discovery.js');
  
  const discovery = new SmartDiscovery({
    minInterval: 3000,
    maxInterval: 30000
  });
  
  // 缓存测试设备
  discovery.cacheDevice({
    deviceId: 'test-device-1',
    deviceName: 'Test Device',
    ip: '192.168.1.100'
  });
  
  // 获取缓存设备
  const device = discovery.getCachedDevice('test-device-1');
  
  if (device && device.deviceName === 'Test Device') {
    console.log('✅ 智能设备发现测试通过');
    console.log(`   - 设备缓存: 正常`);
    console.log(`   - 当前间隔: ${discovery.getBroadcastInterval()}ms`);
  } else {
    throw new Error('设备缓存失败');
  }
  
  const stats = discovery.getStats();
  console.log(`   - 缓存设备数: ${stats.cachedDevices}`);
  console.log();
} catch (error) {
  console.error('❌ 智能设备发现测试失败:', error.message);
  process.exit(1);
}

// 测试 3: 缓存系统
console.log('💾 测试 3: 缓存系统');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
try {
  const { default: CacheManager } = await import('./backend/src/utils/cache-manager.js');
  
  const cache = new CacheManager({
    maxSize: 100,
    defaultTTL: 60000
  });
  
  // 设置缓存
  cache.set('test-key', { data: 'test-value' });
  
  // 获取缓存
  const value = cache.get('test-key');
  
  if (value && value.data === 'test-value') {
    console.log('✅ 缓存系统测试通过');
    console.log(`   - 缓存读写: 正常`);
  } else {
    throw new Error('缓存读写失败');
  }
  
  const stats = cache.getStats();
  console.log(`   - 缓存大小: ${stats.size}/${stats.maxSize}`);
  console.log(`   - 命中率: ${stats.hitRate}`);
  
  cache.destroy();
  console.log();
} catch (error) {
  console.error('❌ 缓存系统测试失败:', error.message);
  process.exit(1);
}

// 测试 4: 性能监控
console.log('📊 测试 4: 性能监控系统');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
try {
  const { default: PerformanceMonitor } = await import('./backend/src/utils/performance-monitor.js');
  
  const monitor = new PerformanceMonitor({
    interval: 1000
  });
  
  // 启动监控
  monitor.start();
  
  // 等待收集数据
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // 获取快照
  const snapshot = monitor.getSnapshot();
  
  if (snapshot.cpu !== undefined && snapshot.memory !== undefined) {
    console.log('✅ 性能监控测试通过');
    console.log(`   - CPU 使用率: ${snapshot.cpu.toFixed(2)}%`);
    console.log(`   - 内存使用率: ${snapshot.memory.toFixed(2)}%`);
    console.log(`   - 系统 CPU 核心数: ${snapshot.system.cpus}`);
  } else {
    throw new Error('性能数据收集失败');
  }
  
  monitor.stop();
  console.log();
} catch (error) {
  console.error('❌ 性能监控测试失败:', error.message);
  process.exit(1);
}

// 测试 5: 数据压缩
console.log('🗜️  测试 5: 数据压缩');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
try {
  const { default: compression } = await import('./backend/src/utils/compression.js');
  
  const testData = 'Hello World! '.repeat(100); // 重复数据，压缩效果好
  
  // 压缩
  const compressed = await compression.compress(testData);
  
  // 解压
  const decompressed = await compression.decompress(compressed);
  
  if (decompressed.toString() === testData) {
    console.log('✅ 数据压缩测试通过');
    console.log(`   - 原始大小: ${Buffer.byteLength(testData)} bytes`);
    console.log(`   - 压缩后: ${compressed.length} bytes`);
    
    const ratio = ((1 - compressed.length / Buffer.byteLength(testData)) * 100).toFixed(2);
    console.log(`   - 压缩率: ${ratio}%`);
  } else {
    throw new Error('压缩/解压失败');
  }
  
  const stats = compression.getStats();
  console.log(`   - 总压缩次数: ${stats.compressed}`);
  console.log();
} catch (error) {
  console.error('❌ 数据压缩测试失败:', error.message);
  process.exit(1);
}

// 测试总结
console.log('🎉 所有优化功能测试通过！');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('✅ 消息队列系统正常');
console.log('✅ 智能设备发现正常');
console.log('✅ 缓存系统正常');
console.log('✅ 性能监控正常');
console.log('✅ 数据压缩正常');
console.log('\n🚀 优化功能已准备就绪！');
console.log('\n查看详细文档:');
console.log('  - optimization-summary.md - 优化总结');
console.log('  - 项目优化方案.md - 优化方案');

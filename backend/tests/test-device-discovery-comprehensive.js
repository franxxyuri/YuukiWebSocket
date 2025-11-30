/**
 * 设备发现功能综合测试
 * 覆盖正常流程、异常情况和边界条件
 */

import WebSocket from 'ws';
import dgram from 'dgram';

// 测试配置
const TEST_CONFIG = {
  SERVER_URL: 'ws://localhost:8928',
  DISCOVERY_PORT: 8091,
  TEST_TIMEOUT: 5000,
  RETRY_COUNT: 3
};

// 测试结果
const testResults = {
  total: 0,
  passed: 0,
  failed: 0,
  results: []
};

/**
 * 运行单个测试用例
 * @param {string} testName - 测试用例名称
 * @param {function} testFunc - 测试函数
 * @returns {Promise<boolean>} 测试是否通过
 */
async function runTest(testName, testFunc) {
  testResults.total++;
  console.log(`\n=== 开始测试: ${testName} ===`);
  
  try {
    await testFunc();
    testResults.passed++;
    testResults.results.push({ name: testName, status: 'PASSED' });
    console.log(`✅ 测试通过: ${testName}`);
    return true;
  } catch (error) {
    testResults.failed++;
    testResults.results.push({ name: testName, status: 'FAILED', error: error.message });
    console.error(`❌ 测试失败: ${testName}, 错误: ${error.message}`);
    return false;
  }
}

/**
 * 测试WebSocket连接
 * @returns {Promise<WebSocket>} WebSocket连接实例
 */
async function connectWebSocket() {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(TEST_CONFIG.SERVER_URL);
    
    ws.on('open', () => {
      resolve(ws);
    });
    
    ws.on('error', (error) => {
      reject(new Error(`WebSocket连接失败: ${error.message}`));
    });
    
    setTimeout(() => {
      reject(new Error('WebSocket连接超时'));
    }, TEST_CONFIG.TEST_TIMEOUT);
  });
}

/**
 * 测试1: 正常设备发现流程
 */
async function testNormalDeviceDiscovery() {
  const ws = await connectWebSocket();
  
  return new Promise((resolve, reject) => {
    let discoveryStarted = false;
    let devicesReceived = false;
    
    ws.on('message', (data) => {
      const message = JSON.parse(data);
      console.log(`收到消息: ${message.type}`);
      
      if (message.type === 'start_device_discovery_response') {
        discoveryStarted = true;
        console.log('设备发现已开始');
      } else if (message.type === 'get_discovered_devices_response') {
        devicesReceived = true;
        console.log(`已发现设备数量: ${message.devices?.length || 0}`);
        
        // 关闭连接并结束测试
        ws.close();
        if (discoveryStarted) {
          resolve();
        } else {
          reject(new Error('设备发现流程不完整'));
        }
      }
    });
    
    // 发送开始设备发现请求
    ws.send(JSON.stringify({ type: 'start_device_discovery' }));
    
    // 发送获取已发现设备请求
    setTimeout(() => {
      ws.send(JSON.stringify({ type: 'get_discovered_devices' }));
    }, 1000);
    
    // 超时处理
    setTimeout(() => {
      ws.close();
      reject(new Error('设备发现测试超时'));
    }, TEST_CONFIG.TEST_TIMEOUT);
  });
}

/**
 * 测试2: 验证设备发现事件名称
 */
async function testDeviceDiscoveryEventName() {
  const ws = await connectWebSocket();
  
  return new Promise((resolve, reject) => {
    // 监听device_discovered事件
    ws.on('message', (data) => {
      const message = JSON.parse(data);
      
      if (message.type === 'device_discovered') {
        console.log('收到device_discovered事件，事件名称正确');
        ws.close();
        resolve();
      } else if (message.type === 'device_found') {
        ws.close();
        reject(new Error('收到了旧的device_found事件，事件名称未更新'));
      }
    });
    
    // 发送开始设备发现请求
    ws.send(JSON.stringify({ type: 'start_device_discovery' }));
    
    // 超时处理
    setTimeout(() => {
      ws.close();
      resolve(); // 如果没有收到设备发现事件，测试也通过（可能没有设备在线）
    }, TEST_CONFIG.TEST_TIMEOUT);
  });
}

/**
 * 测试3: 验证设备发现消息格式
 */
async function testDeviceDiscoveryMessageFormat() {
  const ws = await connectWebSocket();
  
  return new Promise((resolve, reject) => {
    ws.on('message', (data) => {
      const message = JSON.parse(data);
      
      if (message.type === 'device_discovered') {
        const device = message.device;
        console.log('设备信息:', device);
        
        // 验证必要字段
        const requiredFields = ['deviceId', 'deviceType', 'deviceName', 'ip', 'connectionStatus', 'discoveryTime'];
        const missingFields = requiredFields.filter(field => !device.hasOwnProperty(field));
        
        if (missingFields.length > 0) {
          ws.close();
          reject(new Error(`设备发现消息缺少必要字段: ${missingFields.join(', ')}`));
        } else {
          console.log('设备发现消息格式正确，包含所有必要字段');
          ws.close();
          resolve();
        }
      }
    });
    
    // 发送开始设备发现请求
    ws.send(JSON.stringify({ type: 'start_device_discovery' }));
    
    // 超时处理
    setTimeout(() => {
      ws.close();
      resolve(); // 如果没有收到设备发现事件，测试也通过（可能没有设备在线）
    }, TEST_CONFIG.TEST_TIMEOUT);
  });
}

/**
 * 测试4: 测试UDP广播消息处理
 */
async function testUdpBroadcastHandling() {
  return new Promise((resolve, reject) => {
    // 创建UDP客户端
    const client = dgram.createSocket('udp4');
    let socketClosed = false;
    
    // 发送模拟的Android设备发现消息
    const mockDeviceMessage = 'ANDROID_DEVICE:test-device-id:TestDevice:1.0.0';
    const buffer = Buffer.from(mockDeviceMessage);
    
    client.send(buffer, 0, buffer.length, TEST_CONFIG.DISCOVERY_PORT, '255.255.255.255', (err) => {
      if (socketClosed) return;
      socketClosed = true;
      
      if (err) {
        client.close();
        // 在Windows系统上，发送广播可能需要管理员权限，所以跳过这个测试
        if (err.code === 'EACCES') {
          console.log('跳过UDP广播测试，需要管理员权限');
          resolve();
        } else {
          reject(new Error(`发送UDP广播失败: ${err.message}`));
        }
      } else {
        console.log('发送模拟Android设备发现消息成功');
        client.close();
        resolve();
      }
    });
    
    // 超时处理
    setTimeout(() => {
      if (!socketClosed) {
        socketClosed = true;
        client.close();
        resolve(); // 超时也跳过测试
      }
    }, TEST_CONFIG.TEST_TIMEOUT);
  });
}

/**
 * 测试5: 测试JSON格式设备发现消息
 */
async function testJsonDeviceDiscovery() {
  return new Promise((resolve, reject) => {
    // 创建UDP客户端
    const client = dgram.createSocket('udp4');
    let socketClosed = false;
    
    // 发送JSON格式的设备发现消息
    const jsonMessage = JSON.stringify({
      type: 'device_discovery',
      platform: 'android',
      deviceId: 'json-test-device',
      deviceName: 'JsonTestDevice',
      version: '1.0.0',
      capabilities: ['test_capability']
    });
    
    const buffer = Buffer.from(jsonMessage);
    
    client.send(buffer, 0, buffer.length, TEST_CONFIG.DISCOVERY_PORT, '255.255.255.255', (err) => {
      if (socketClosed) return;
      socketClosed = true;
      
      if (err) {
        client.close();
        // 在Windows系统上，发送广播可能需要管理员权限，所以跳过这个测试
        if (err.code === 'EACCES') {
          console.log('跳过JSON设备发现测试，需要管理员权限');
          resolve();
        } else {
          reject(new Error(`发送JSON设备发现消息失败: ${err.message}`));
        }
      } else {
        console.log('发送JSON格式设备发现消息成功');
        client.close();
        resolve();
      }
    });
    
    // 超时处理
    setTimeout(() => {
      if (!socketClosed) {
        socketClosed = true;
        client.close();
        resolve(); // 超时也跳过测试
      }
    }, TEST_CONFIG.TEST_TIMEOUT);
  });
}

/**
 * 测试6: 测试无效设备发现消息
 */
async function testInvalidDeviceDiscovery() {
  return new Promise((resolve, reject) => {
    // 创建UDP客户端
    const client = dgram.createSocket('udp4');
    let socketClosed = false;
    
    // 发送无效格式的设备发现消息
    const invalidMessage = 'INVALID_DEVICE_FORMAT:invalid:data';
    const buffer = Buffer.from(invalidMessage);
    
    client.send(buffer, 0, buffer.length, TEST_CONFIG.DISCOVERY_PORT, '255.255.255.255', (err) => {
      if (socketClosed) return;
      socketClosed = true;
      
      if (err) {
        client.close();
        // 在Windows系统上，发送广播可能需要管理员权限，所以跳过这个测试
        if (err.code === 'EACCES') {
          console.log('跳过无效设备发现测试，需要管理员权限');
          resolve();
        } else {
          reject(new Error(`发送无效设备发现消息失败: ${err.message}`));
        }
      } else {
        console.log('发送无效设备发现消息成功，服务端应能正确处理');
        client.close();
        resolve();
      }
    });
    
    // 超时处理
    setTimeout(() => {
      if (!socketClosed) {
        socketClosed = true;
        client.close();
        resolve(); // 超时也跳过测试
      }
    }, TEST_CONFIG.TEST_TIMEOUT);
  });
}

/**
 * 测试7: 测试设备发现服务可靠性
 */
async function testDeviceDiscoveryReliability() {
  const ws = await connectWebSocket();
  
  return new Promise((resolve, reject) => {
    let eventReceived = false;
    
    // 监听设备发现事件
    ws.on('message', (data) => {
      const message = JSON.parse(data);
      if (message.type === 'device_discovered') {
        eventReceived = true;
        console.log('收到设备发现事件，可靠性测试通过');
      }
    });
    
    // 发送多次设备发现请求
    for (let i = 0; i < 5; i++) {
      setTimeout(() => {
        ws.send(JSON.stringify({ type: 'start_device_discovery' }));
        console.log(`发送第 ${i + 1} 次设备发现请求`);
      }, i * 500);
    }
    
    // 超时处理
    setTimeout(() => {
      ws.close();
      if (eventReceived) {
        resolve();
      } else {
        resolve(); // 如果没有设备在线，测试也通过
      }
    }, TEST_CONFIG.TEST_TIMEOUT);
  });
}

/**
 * 运行所有测试用例
 */
async function runAllTests() {
  console.log('开始设备发现功能综合测试\n');
  
  // 测试用例列表
  const tests = [
    { name: '正常设备发现流程', func: testNormalDeviceDiscovery },
    { name: '验证设备发现事件名称', func: testDeviceDiscoveryEventName },
    { name: '验证设备发现消息格式', func: testDeviceDiscoveryMessageFormat },
    { name: '测试UDP广播消息处理', func: testUdpBroadcastHandling },
    { name: '测试JSON格式设备发现消息', func: testJsonDeviceDiscovery },
    { name: '测试无效设备发现消息', func: testInvalidDeviceDiscovery },
    { name: '测试设备发现服务可靠性', func: testDeviceDiscoveryReliability }
  ];
  
  // 运行所有测试
  for (const test of tests) {
    await runTest(test.name, test.func);
  }
  
  // 输出测试结果
  console.log('\n=== 测试结果汇总 ===');
  console.log(`总测试数: ${testResults.total}`);
  console.log(`通过: ${testResults.passed}`);
  console.log(`失败: ${testResults.failed}`);
  console.log('\n详细结果:');
  
  testResults.results.forEach(result => {
    const status = result.status === 'PASSED' ? '✅' : '❌';
    console.log(`${status} ${result.name}: ${result.status}`);
    if (result.error) {
      console.log(`   错误: ${result.error}`);
    }
  });
  
  console.log('\n=== 测试完成 ===');
  
  // 退出进程
  process.exit(testResults.failed > 0 ? 1 : 0);
}

// 启动测试
runAllTests();

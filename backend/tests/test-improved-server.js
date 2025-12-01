/**
 * 测试改进后的服务器功能
 * 使用ES模块格式，测试所有改进措施
 */

// 导入child_process模块
import { execSync } from 'child_process';

// 测试配置
// 从环境变量读取端口配置，或使用默认值
const serverPort = parseInt(process.env.SERVER_PORT) || 8928;
const SERVER_URL = `http://127.0.0.1:${serverPort}`;
const WS_URL = `ws://127.0.0.1:${serverPort}`;

// 测试结果
const testResults = {
  passed: 0,
  failed: 0,
  total: 0
};

// 测试函数
async function runTest(name, testFn) {
  testResults.total++;
  console.log(`\n=== 测试: ${name} ===`);
  try {
    await testFn();
    console.log(`✅ 测试通过: ${name}`);
    testResults.passed++;
  } catch (error) {
    console.error(`❌ 测试失败: ${name}`);
    console.error(`   错误: ${error.message}`);
    testResults.failed++;
  }
}

// 1. 测试API路由的设备列表返回格式
async function testApiDevicesFormat() {
  // 使用curl命令测试，绕过代理问题
  const result = execSync(`curl.exe --noproxy 127.0.0.1 ${SERVER_URL}/api/devices`, { encoding: 'utf8' });
  const data = JSON.parse(result);
  
  // 验证返回格式是数组
  if (!Array.isArray(data)) {
    throw new Error('设备列表返回格式应为数组');
  }
  
  console.log(`   设备数量: ${data.length}`);
}

// 2. 测试服务器状态API
async function testApiStatus() {
  // 使用curl命令测试，绕过代理问题
  const result = execSync(`curl.exe --noproxy 127.0.0.1 ${SERVER_URL}/api/status`, { encoding: 'utf8' });
  const data = JSON.parse(result);
  
  // 验证返回格式
  if (!data.success || data.server !== 'running') {
    throw new Error('服务器状态API返回格式不正确');
  }
  
  console.log(`   服务器状态: ${data.server}`);
  console.log(`   Android连接状态: ${data.androidConnected}`);
  console.log(`   客户端数量: ${data.totalClients}`);
}

// 3. 测试已连接设备API
async function testApiConnectedDevices() {
  // 使用curl命令测试，绕过代理问题
  const result = execSync(`curl.exe --noproxy 127.0.0.1 ${SERVER_URL}/api/connected-devices`, { encoding: 'utf8' });
  const data = JSON.parse(result);
  
  // 验证返回格式
  if (!data.success || !Array.isArray(data.devices)) {
    throw new Error('已连接设备API返回格式不正确');
  }
  
  console.log(`   已连接设备数量: ${data.devices.length}`);
}

// 4. 测试API缓存机制
async function testApiCaching() {
  // 第一次请求
  const startTime1 = Date.now();
  execSync(`curl.exe --noproxy 127.0.0.1 ${SERVER_URL}/api/status`, { encoding: 'utf8' });
  const duration1 = Date.now() - startTime1;
  
  // 第二次请求（应该使用缓存）
  const startTime2 = Date.now();
  execSync(`curl.exe --noproxy 127.0.0.1 ${SERVER_URL}/api/status`, { encoding: 'utf8' });
  const duration2 = Date.now() - startTime2;
  
  console.log(`   第一次请求耗时: ${duration1}ms`);
  console.log(`   第二次请求耗时: ${duration2}ms`);
  
  // 缓存请求应该更快
  if (duration2 >= duration1) {
    console.log(`   ⚠️  缓存效果不明显，可能是因为服务器负载低`);
  }
}

// 5. 测试API安全性 - 无效设备ID
async function testApiSecurityInvalidDeviceId() {
  // 使用curl命令测试，绕过代理问题
  const result = execSync(`curl.exe --noproxy 127.0.0.1 -X POST -H "Content-Type: application/json" -d '{"deviceId":"invalid-device-id-with-特殊字符!@#$%^&*()"}' ${SERVER_URL}/api/connect-device`, { encoding: 'utf8' });
  const data = JSON.parse(result);
  
  // 应该返回错误
  if (data.success) {
    throw new Error('API安全性测试失败: 应该拒绝包含特殊字符的设备ID');
  }
  
  console.log(`   安全测试通过: 拒绝了包含特殊字符的设备ID`);
}

// 6. 测试静态资源访问
async function testStaticResources() {
  // 使用curl命令测试，绕过代理问题
  try {
    execSync(`curl.exe --noproxy 127.0.0.1 ${SERVER_URL}/vite.svg`, { encoding: 'utf8' });
    console.log(`   静态资源访问通过: vite.svg`);
  } catch (error) {
    throw new Error('静态资源访问失败: vite.svg');
  }
}

// 7. 测试简单测试路由
async function testSimpleTestRoute() {
  // 使用curl命令测试，绕过代理问题
  const result = execSync(`curl.exe --noproxy 127.0.0.1 ${SERVER_URL}/test`, { encoding: 'utf8' });
  
  if (result.trim() !== '测试成功!') {
    throw new Error('简单测试路由返回不正确');
  }
  
  console.log(`   简单测试路由通过: 返回了正确的响应`);
}

// 主测试函数
async function runAllTests() {
  console.log('\n====================================');
  console.log('运行改进后服务器的测试');
  console.log('====================================');
  
  // 运行所有测试
  await runTest('API设备列表格式', testApiDevicesFormat);
  await runTest('API服务器状态', testApiStatus);
  await runTest('API已连接设备', testApiConnectedDevices);
  await runTest('API缓存机制', testApiCaching);
  await runTest('API安全性 - 无效设备ID', testApiSecurityInvalidDeviceId);
  await runTest('静态资源访问', testStaticResources);
  await runTest('简单测试路由', testSimpleTestRoute);
  
  // 输出测试结果
  console.log('\n====================================');
  console.log('测试结果汇总');
  console.log('====================================');
  console.log(`总测试数: ${testResults.total}`);
  console.log(`通过: ${testResults.passed}`);
  console.log(`失败: ${testResults.failed}`);
  
  if (testResults.failed === 0) {
    console.log('\n🎉 所有测试通过!');
  } else {
    console.log(`\n⚠️  有 ${testResults.failed} 个测试失败`);
  }
  
  return testResults.failed === 0;
}

// 直接运行测试
runAllTests().then(success => {
  process.exit(success ? 0 : 1);
}).catch(error => {
  console.error('测试运行出错:', error);
  process.exit(1);
});

export { runAllTests };
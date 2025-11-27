// 测试服务端模块
console.log('🔍 检查服务端模块...');

try {
  console.log('加载网络通信模块...');
  const NetworkCommunication = require('./network-communication.js');
  console.log('✅ NetworkCommunication模块加载成功');

  console.log('加载设备发现模块...');
  const DeviceDiscovery = require('./device-discovery.js');
  console.log('✅ DeviceDiscovery模块加载成功');

  console.log('加载远程控制模块...');
  const RemoteController = require('./remote-controller.js');
  console.log('✅ RemoteController模块加载成功');

  console.log('加载屏幕显示模块...');
  const ScreenDisplayManager = require('./screen-display.js');
  console.log('✅ ScreenDisplayManager模块加载成功');

  console.log('');
  console.log('🎉 所有服务端模块检查通过！');
  console.log('💡 服务端组件已就绪，可以正常启动');

} catch (error) {
  console.error('❌ 模块加载失败:', error.message);
  process.exit(1);
}
const net = require('net');

console.log('创建模拟Android设备客户端...');

// 创建到服务器的连接
const client = new net.Socket();

// 模拟设备信息
const deviceInfo = {
  deviceId: 'android-device-123',
  deviceName: '模拟Android设备',
  platform: 'Android',
  ip: '127.0.0.1',
  port: 8829, // NetworkCommunication服务器端口
  version: '1.0.0',
  capabilities: ['file_transfer', 'screen_mirror', 'remote_control', 'notification', 'clipboard']
};

client.connect(8829, '127.0.0.1', function() {
    console.log('连接到服务器成功');
    
    // 发送设备信息进行认证
    const message = {
        type: 'device_info',
        deviceInfo: deviceInfo
    };
    
    client.write(JSON.stringify(message) + '\n');
    console.log('发送设备信息:', deviceInfo);
});

client.on('data', function(data) {
    console.log('从服务器接收数据:', data.toString());
    
    // 解析服务器响应
    const response = data.toString().trim();
    const lines = response.split('\n');
    
    for (const line of lines) {
        if (line) {
            try {
                const message = JSON.parse(line);
                console.log('解析的消息:', message);
                
                if (message.type === 'authentication_success') {
                    console.log('设备认证成功！');
                }
            } catch (e) {
                console.log('无法解析消息:', line);
            }
        }
    }
});

client.on('close', function() {
    console.log('连接已关闭');
});

client.on('error', function(err) {
    console.log('连接错误:', err);
});
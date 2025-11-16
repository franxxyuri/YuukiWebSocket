const WebSocket = require('ws');

// 测试WebSocket连接
function testWebSocketConnection() {
    console.log('测试WebSocket连接...');
    
    const ws = new WebSocket('ws://localhost:8827');
    
    ws.on('open', function open() {
        console.log('WebSocket连接成功');
        
        // 发送测试消息
        ws.send(JSON.stringify({
            type: 'device_info',
            deviceInfo: {
                deviceId: 'test-device-001',
                deviceName: 'Test Device',
                platform: 'test',
                version: '1.0.0',
                ip: '127.0.0.1',
                capabilities: ['test']
            }
        }));
    });
    
    ws.on('message', function incoming(data) {
        const message = JSON.parse(data);
        console.log('收到服务器消息:', message.type);
        
        if (message.type === 'connection_established') {
            console.log('连接建立成功，客户端ID:', message.clientId);
        }
    });
    
    ws.on('error', function error(err) {
        console.error('WebSocket错误:', err);
    });
    
    ws.on('close', function close() {
        console.log('WebSocket连接已关闭');
    });
}

// 测试HTTP API
async function testHttpApi() {
    console.log('测试HTTP API...');
    
    try {
        const response = await fetch('http://localhost:8827/api/status');
        const data = await response.json();
        console.log('服务器状态:', data);
    } catch (error) {
        console.error('HTTP API测试失败:', error);
    }
}

// 运行测试
console.log('Windows-Android Connect 测试脚本');
console.log('================================');

// 测试WebSocket连接
testWebSocketConnection();

// 测试HTTP API
setTimeout(() => {
    testHttpApi();
}, 2000);

// 5秒后退出
setTimeout(() => {
    console.log('测试完成');
    process.exit(0);
}, 5000);
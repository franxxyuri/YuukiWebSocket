const WebSocket = require('ws');

console.log('模拟Android客户端连接测试...');

// 模拟Android客户端的连接过程
function simulateAndroidConnection() {
    console.log('\n🔗 正在模拟Android客户端连接...');
    
    try {
        const ws = new WebSocket('ws://192.168.188.16:8828');
        let clientId = null;
        
        ws.on('open', () => {
            console.log('✅ WebSocket连接已建立');
            
            // 发送设备信息（模拟Android客户端）
            const deviceInfo = {
                type: 'device_info',
                deviceInfo: {
                    deviceId: 'android-test-' + Date.now(),
                    deviceName: 'Android Test Device',
                    platform: 'android',
                    version: '1.0.0',
                    ip: '192.168.188.xxx', // Android设备IP
                    capabilities: ['file_transfer', 'screen_mirror', 'remote_control', 'notification', 'clipboard_sync']
                }
            };
            
            console.log('📤 发送设备信息:', JSON.stringify(deviceInfo, null, 2));
            ws.send(JSON.stringify(deviceInfo));
        });
        
        ws.on('message', (data) => {
            const message = JSON.parse(data.toString());
            console.log('📨 收到服务器消息:', JSON.stringify(message, null, 2));
            
            if (message.type === 'connection_established') {
                clientId = message.clientId;
                console.log('🎉 连接成功！客户端ID:', clientId);
            }
        });
        
        ws.on('error', (error) => {
            console.log('❌ 连接错误:', error.message);
        });
        
        ws.on('close', (code, reason) => {
            console.log('🔌 连接关闭 - 代码:', code, '原因:', reason.toString());
        });
        
        // 发送心跳测试
        setTimeout(() => {
            if (ws.readyState === WebSocket.OPEN) {
                console.log('💓 发送心跳...');
                ws.send(JSON.stringify({
                    type: 'heartbeat',
                    timestamp: Date.now()
                }));
            }
        }, 3000);
        
        // 10秒后关闭连接
        setTimeout(() => {
            if (ws.readyState === WebSocket.OPEN) {
                ws.close();
                console.log('\n✅ 测试完成 - 连接正常！');
                process.exit(0);
            }
        }, 10000);
        
    } catch (error) {
        console.log('❌ 创建连接失败:', error.message);
        process.exit(1);
    }
}

simulateAndroidConnection();
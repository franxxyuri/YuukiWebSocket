import WebSocket from 'ws';

console.log('正在测试WebSocket连接...');

// 测试本地连接
console.log('\n1. 测试本地连接 (localhost:8828)');
try {
    const ws1 = new WebSocket('ws://localhost:8828');
    
    ws1.on('open', () => {
        console.log('✅ 本地连接成功');
        ws1.send(JSON.stringify({
            type: 'device_info',
            deviceInfo: {
                platform: 'test',
                deviceName: 'Test Client',
                deviceId: 'test-123'
            }
        }));
    });
    
    ws1.on('message', (data) => {
        console.log('📨 收到消息:', data.toString());
        ws1.close();
    });
    
    ws1.on('error', (error) => {
        console.log('❌ 本地连接失败:', error.message);
    });
    
    ws1.on('close', () => {
        console.log('🔌 本地连接已关闭');
        
        // 测试局域网连接
        console.log('\n2. 测试局域网连接 (192.168.188.16:8828)');
        testLanConnection();
    });
} catch (error) {
    console.log('❌ 创建WebSocket失败:', error.message);
    testLanConnection();
}

function testLanConnection() {
    try {
        const ws2 = new WebSocket('ws://192.168.188.16:8828');
        
        ws2.on('open', () => {
            console.log('✅ 局域网连接成功');
            ws2.send(JSON.stringify({
                type: 'device_info',
                deviceInfo: {
                    platform: 'test',
                    deviceName: 'Test Client',
                    deviceId: 'test-456'
                }
            }));
        });
        
        ws2.on('message', (data) => {
            console.log('📨 收到消息:', data.toString());
            ws2.close();
        });
        
        ws2.on('error', (error) => {
            console.log('❌ 局域网连接失败:', error.message);
        });
        
        ws2.on('close', () => {
            console.log('🔌 局域网连接已关闭');
            console.log('\n测试完成');
            process.exit(0);
        });
        
        // 10秒超时
        setTimeout(() => {
            if (ws2.readyState === WebSocket.CONNECTING) {
                console.log('⏰ 局域网连接超时');
                ws2.close();
                process.exit(1);
            }
        }, 10000);
        
    } catch (error) {
        console.log('❌ 创建局域网连接失败:', error.message);
        process.exit(1);
    }
}
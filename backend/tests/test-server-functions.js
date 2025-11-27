// 服务端功能测试脚本
import WebSocket from 'ws';
import http from 'http';

console.log('开始测试Windows-Android Connect服务端功能...');

// 测试HTTP API
async function testHttpApi() {
    console.log('\n--- 测试HTTP API ---');
    
    try {
        // 测试状态API
        const statusResponse = await fetch('http://localhost:8928/api/status');
        if (statusResponse.ok) {
            const statusData = await statusResponse.json();
            console.log('✅ 状态API测试通过:', statusData);
        } else {
            console.log('❌ 状态API测试失败:', statusResponse.status);
        }
    } catch (error) {
        console.log('❌ HTTP API测试失败:', error.message);
    }
}

// 测试WebSocket连接
function testWebSocket() {
    console.log('\n--- 测试WebSocket连接 ---');
    
    return new Promise((resolve) => {
        // 尝试连接到WebSocket服务器
        const ws = new WebSocket('ws://localhost:8928');
        let timeoutId;
        
        ws.on('open', function open() {
            console.log('✅ WebSocket连接成功');
            
            // 发送设备信息
            const deviceInfo = {
                type: 'device_info',
                deviceInfo: {
                    platform: 'test_client',
                    deviceName: 'Node.js Test Client',
                    deviceId: 'test-' + Date.now()
                }
            };
            
            ws.send(JSON.stringify(deviceInfo));
            console.log('📤 发送设备信息');
            
            // 设置超时
            timeoutId = setTimeout(() => {
                console.log('⏳ WebSocket测试完成');
                ws.close();
                resolve();
            }, 3000);
        });
        
        ws.on('message', function message(data) {
            try {
                const msg = JSON.parse(data);
                console.log('📥 收到消息:', msg.type);
            } catch (e) {
                console.log('📥 收到消息:', data.toString());
            }
        });
        
        ws.on('error', function error(err) {
            console.log('❌ WebSocket连接错误:', err.message);
            clearTimeout(timeoutId);
            resolve();
        });
        
        ws.on('close', function close() {
            console.log('🔌 WebSocket连接已关闭');
            clearTimeout(timeoutId);
            resolve();
        });
    });
}

// 运行所有测试
async function runAllTests() {
    console.log('🚀 开始服务端功能测试...\n');
    
    // 测试HTTP API
    await testHttpApi();
    
    // 测试WebSocket连接
    await testWebSocket();
    
    console.log('\n✅ 所有测试完成');
}

// 执行测试
runAllTests().catch(console.error);
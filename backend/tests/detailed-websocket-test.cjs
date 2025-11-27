const WebSocket = require('ws');

console.log('🔍 详细WebSocket连接诊断...\n');

// 创建WebSocket服务器监听器
const ws = new WebSocket('ws://192.168.188.16:8828');
let connectionSteps = [];

ws.on('open', () => {
    connectionSteps.push('✅ WebSocket连接已建立');
    console.log('✅ WebSocket连接已建立');
    
    // 发送设备信息
    const deviceInfo = {
        type: 'device_info',
        deviceInfo: {
            deviceId: 'android-debug-' + Date.now(),
            deviceName: 'Android Debug Device',
            platform: 'android',
            version: '1.0.0',
            ip: '192.168.188.xxx',
            capabilities: ['file_transfer', 'screen_mirror', 'remote_control']
        }
    };
    
    connectionSteps.push('📤 发送设备信息');
    console.log('📤 发送设备信息:', JSON.stringify(deviceInfo, null, 2));
    ws.send(JSON.stringify(deviceInfo));
});

ws.on('message', (data) => {
    const message = JSON.parse(data.toString());
    connectionSteps.push('📨 收到服务器响应: ' + message.type);
    console.log('📨 收到服务器消息:', JSON.stringify(message, null, 2));
    
    if (message.type === 'connection_established') {
        connectionSteps.push('🎉 连接成功建立');
        console.log('\n🎉 连接成功建立！');
        
        // 测试心跳
        setTimeout(() => {
            const heartbeat = {
                type: 'heartbeat',
                timestamp: Date.now()
            };
            connectionSteps.push('💓 发送心跳');
            console.log('💓 发送心跳:', JSON.stringify(heartbeat));
            ws.send(JSON.stringify(heartbeat));
        }, 2000);
    }
});

ws.on('error', (error) => {
    connectionSteps.push('❌ 连接错误: ' + error.message);
    console.log('❌ 连接错误:', error.message);
    console.log('\n🔍 连接步骤详情:');
    connectionSteps.forEach((step, index) => {
        console.log(`${index + 1}. ${step}`);
    });
});

ws.on('close', (code, reason) => {
    connectionSteps.push(`🔌 连接关闭 - 代码: ${code}, 原因: ${reason.toString()}`);
    console.log(`🔌 连接关闭 - 代码: ${code}, 原因: ${reason.toString()}`);
    
    console.log('\n📋 完整连接步骤:');
    connectionSteps.forEach((step, index) => {
        console.log(`${index + 1}. ${step}`);
    });
    
    // 分析连接结果
    console.log('\n🔍 连接分析:');
    if (connectionSteps.includes('🎉 连接成功建立')) {
        console.log('✅ WebSocket连接完全正常');
        console.log('❌ Android客户端问题可能在于:');
        console.log('   - 网络权限配置');
        console.log('   - WebSocket客户端库实现');
        console.log('   - 应用配置参数');
    } else {
        console.log('❌ 连接失败，可能原因:');
        console.log('   - 网络防火墙阻止');
        console.log('   - IP地址或端口配置错误');
        console.log('   - 服务器连接数限制');
    }
    
    process.exit(0);
});

// 15秒超时
setTimeout(() => {
    if (ws.readyState === WebSocket.CONNECTING) {
        connectionSteps.push('⏰ 连接超时');
        console.log('⏰ 连接超时');
        ws.close();
    }
}, 15000);
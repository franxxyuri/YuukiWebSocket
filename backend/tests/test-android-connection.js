// 测试WebSocket连接的脚本
import WebSocket from 'ws';
import { setTimeout } from 'timers/promises';

console.log('开始测试Android客户端连接...');

// 创建WebSocket连接
const ws = new WebSocket('ws://localhost:8928');

ws.on('open', () => {
    console.log('✅ 已成功连接到WebSocket服务器');
    
    // 发送Android设备信息
    console.log('📤 发送设备信息...');
    ws.send(JSON.stringify({
        type: 'device_info',
        deviceInfo: {
            deviceId: 'test-android-device',
            deviceName: 'Test Android Device',
            platform: 'android',
            version: '1.0.0',
            ip: '127.0.0.1',
            capabilities: [
                'file_transfer',
                'screen_mirror',
                'remote_control',
                'notification',
                'clipboard_sync'
            ]
        }
    }));
});

ws.on('message', (data) => {
    try {
        const message = JSON.parse(data.toString());
        console.log('📥 收到服务器消息:', message.type);
        
        if (message.type === 'connection_established') {
            console.log('✅ 连接确认成功:', message);
        } else if (message.type === 'authentication_success') {
            console.log('✅ 认证成功:', message);
        } else {
            console.log('📋 其他消息类型:', message);
        }
    } catch (error) {
        console.log('📋 收到非JSON消息:', data.toString());
    }
});

ws.on('error', (error) => {
    console.error('❌ WebSocket错误:', error.message);
});

ws.on('close', (code, reason) => {
    console.log(`⚠️ 连接已关闭 - 代码: ${code}, 原因: ${reason}`);
});
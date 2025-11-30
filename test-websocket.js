import WebSocket from 'ws';

// 测试后端WebSocket连接
console.log('测试后端WebSocket连接...');
const ws1 = new WebSocket('ws://localhost:8928');

ws1.on('open', () => {
    console.log('✅ 后端WebSocket连接成功');
    ws1.send(JSON.stringify({ type: 'heartbeat' }));
    setTimeout(() => ws1.close(), 1000);
});

ws1.on('message', (data) => {
    console.log('📩 收到后端消息:', data.toString());
});

ws1.on('error', (error) => {
    console.error('❌ 后端WebSocket连接错误:', error.message);
});

ws1.on('close', () => {
    console.log('🔌 后端WebSocket连接关闭');
    // 测试前端代理WebSocket连接
    testFrontendWebSocket();
});

// 测试前端代理WebSocket连接
function testFrontendWebSocket() {
    console.log('\n测试前端代理WebSocket连接...');
    const ws2 = new WebSocket('ws://localhost:8781/ws');
    
    ws2.on('open', () => {
        console.log('✅ 前端代理WebSocket连接成功');
        ws2.send(JSON.stringify({ type: 'heartbeat' }));
        setTimeout(() => ws2.close(), 1000);
    });
    
    ws2.on('message', (data) => {
        console.log('📩 收到前端代理消息:', data.toString());
    });
    
    ws2.on('error', (error) => {
        console.error('❌ 前端代理WebSocket连接错误:', error.message);
    });
    
    ws2.on('close', () => {
        console.log('🔌 前端代理WebSocket连接关闭');
        console.log('\n✅ 所有WebSocket测试完成');
    });
}
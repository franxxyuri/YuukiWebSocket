// 检查服务器状态的脚本
import { spawn } from 'child_process';
import { setTimeout } from 'timers/promises';

async function checkServerStatus() {
    console.log('检查Windows-Android Connect服务器状态...');
    
    // 检查端口8828 (WebSocket服务)
    try {
        const response8828 = await fetch('http://localhost:8828/api/status');
        if (response8828.ok) {
            let data;
            try {
                data = await response8828.json();
            } catch (parseError) {
                console.log('⚠️ 端口8828 (WebSocket服务) 响应不是有效的JSON:', await response8828.text());
                return;
            }
            console.log('✅ 端口8828 (WebSocket服务) 正常运行:', data);
        } else {
            console.log('❌ 端口8828 (WebSocket服务) 未响应，状态码:', response8828.status);
        }
    } catch (error) {
        console.log('❌ 端口8828 (WebSocket服务) 未运行:', error.message);
    }
    
    // 检查端口8080 (Vite服务)
    try {
        const response8080 = await fetch('http://localhost:8080');
        if (response8080.ok) {
            console.log('✅ 端口8080 (Vite服务) 正常运行');
        } else {
            console.log('❌ 端口8080 (Vite服务) 未响应，状态码:', response8080.status);
        }
    } catch (error) {
        console.log('❌ 端口8080 (Vite服务) 未运行:', error.message);
    }
}

// 运行检查
checkServerStatus().catch(console.error);
// 检查服务器状态的脚本
import { spawn } from 'child_process';
import { setTimeout } from 'timers/promises';

async function checkServerStatus() {
    console.log('检查Windows-Android Connect服务器状态...');
    
    // 检查端口8928 (WebSocket服务)
    try {
        const response8928 = await fetch('http://localhost:8928/api/status');
        if (response8928.ok) {
            let data;
            try {
                data = await response8928.json();
            } catch (parseError) {
                console.log('⚠️ 端口8928 (WebSocket服务) 响应不是有效的JSON:', await response8928.text());
                return;
            }
            console.log('✅ 端口8928 (WebSocket服务) 正常运行:', data);
        } else {
            console.log('❌ 端口8928 (WebSocket服务) 未响应，状态码:', response8928.status);
        }
    } catch (error) {
        console.log('❌ 端口8928 (WebSocket服务) 未运行:', error.message);
    }
    
    // 检查端口8781 (Vite服务)
    try {
        const response8781 = await fetch('http://localhost:8781');
        if (response8781.ok) {
            console.log('✅ 端口8781 (Vite服务) 正常运行');
        } else {
            console.log('❌ 端口8781 (Vite服务) 未响应，状态码:', response8781.status);
        }
    } catch (error) {
        console.log('❌ 端口8781 (Vite服务) 未运行:', error.message);
    }
}

// 运行检查
checkServerStatus().catch(console.error);
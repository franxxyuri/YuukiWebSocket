# Windows-Android Connect 系统架构

## 整体架构

```
┌─────────────────┐    HTTP/WS代理    ┌──────────────────┐
│   Web前端UI      │◄────────────────►│  Vite开发服务器    │
│  (React + WS)    │                 │    (端口8781)     │
└─────────────────┘                 └─────────┬────────┘
                                              │ WebSocket
                                              ▼
                                  ┌──────────────────────┐
                                  │   Node.js主服务器     │
                                  │   (端口8928 WS)     │
                                  └─────────┬────────────┘
                                            │ TCP Socket
                                            ▼
                                ┌─────────────────────────┐
                                │      Android客户端       │
                                │        (Kotlin)         │
                                └─────────────────────────┘
```

## 服务端组件

### 主服务器 (integrated-vite-server.js)
- **端口**: 8928 (WebSocket)
- **功能**: 核心业务逻辑和消息转发
- **特性**: 支持多客户端连接、消息路由、设备管理

### Vite开发服务器
- **端口**: 8781
- **功能**: 前端开发和代理
- **代理配置**: `/ws` → 8928, `/api` → 8928

### 设备发现服务
- **协议**: UDP
- **端口**: 8190
- **功能**: 局域网设备自动发现

## 技术栈

- **前端**: Vite + React + WebSocket
- **后端**: Node.js + Express + WebSocket
- **Android**: Kotlin + WebSocket
- **设备发现**: UDP广播 (端口8190)

## 核心功能模块

1. **设备管理**: 自动发现和连接管理
2. **文件传输**: 大文件分块传输和断点续传
3. **屏幕投屏**: 实时屏幕镜像和压缩优化
4. **远程控制**: 鼠标键盘事件传输
5. **剪贴板同步**: 双向内容共享
6. **通知同步**: Android通知推送

## 数据流

1. **设备发现**: UDP广播 → 设备注册
2. **WebSocket连接**: 建立持久连接 → 心跳维持
3. **功能交互**: JSON消息 → 业务处理 → 响应返回
4. **数据传输**: 分块传输 → 进度反馈 → 完成确认

## 消息处理流程

1. **连接建立**: WebSocket握手 → 客户端注册
2. **消息路由**: 消息解析 → 类型分发 → 业务处理
3. **响应返回**: 处理结果 → JSON响应 → 客户端接收

## 数据存储

- **内存存储**: 活跃连接、设备信息
- **临时文件**: 文件传输缓存、日志文件
- **配置文件**: 端口配置、功能开关

## 性能优化

- WebSocket连接池管理
- 图像压缩算法
- 文件分块传输
- 内存缓存机制
- 网络状况自适应

## 架构合理性分析

### ✅ 合理之处

1. **分层设计合理**：
   - 服务端负责核心业务逻辑和消息转发
   - Vite提供开发便利性，代理请求到后端
   - 前后端分离，职责清晰

2. **通信协议适配**：
   - WebSocket用于实时双向通信
   - UDP用于设备发现，避免TCP连接开销
   - 端口分配合理，避免冲突

3. **功能模块化**：
   - 设备发现、文件传输、屏幕镜像等功能模块化
   - 消息类型分类清晰，便于扩展

4. **代理机制**：
   - Vite代理将8781端口请求转发到8928端口，简化前端连接配置

### ⚠️ 需要改进之处

1. **端口配置硬编码**：
   - 端口号分散在多个文件中
   - 缺乏统一的配置管理
   - **建议**：使用配置文件统一管理端口设置

2. **错误处理不完善**：
   - 缺乏统一的错误处理机制
   - 客户端断线重连逻辑简单
   - **建议**：实现完善的错误处理和重连机制

3. **安全性考虑不足**：
   - 缺乏身份验证机制
   - 消息传输未加密
   - **建议**：添加身份验证和数据加密

4. **性能优化空间**：
   - 大文件传输缺乏进度反馈
   - 屏幕镜像未进行压缩优化
   - **建议**：实现压缩算法和进度反馈

## 改进建议

### 1. 配置管理优化

#### 改进方案
```javascript
// backend/config/config.mjs
export default {
  server: {
    port: process.env.SERVER_PORT || 8928,
    host: process.env.SERVER_HOST || '0.0.0.0'
  },
  vite: {
    port: process.env.VITE_PORT || 8781,
    host: process.env.VITE_HOST || '0.0.0.0'
  },
  discovery: {
    port: process.env.DISCOVERY_PORT || 8190
  }
};
```

### 2. 错误处理机制

#### 改进方案
```javascript
// 完善的错误处理和重连机制
class ConnectionManager {
    constructor() {
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
        this.reconnectDelay = 1000;
    }
    
    handleError(error, ws) {
        console.error('连接错误:', error);
        this.scheduleReconnect();
    }
    
    scheduleReconnect() {
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
            setTimeout(() => {
                this.reconnectAttempts++;
                this.connect();
            }, this.reconnectDelay * Math.pow(2, this.reconnectAttempts));
        }
    }
}
```

### 3. 安全性增强

#### 改进方案
```javascript
// 添加身份验证
class AuthManager {
    validateConnection(request) {
        const token = request.headers['authorization'];
        return this.verifyToken(token);
    }
    
    verifyToken(token) {
        // JWT验证逻辑
        try {
            return jwt.verify(token, SECRET_KEY);
        } catch (error) {
            return null;
        }
    }
}

// 消息加密
class MessageCrypto {
    encrypt(message) {
        return crypto.createCipher('aes-256-cbc', ENCRYPTION_KEY)
            .update(JSON.stringify(message), 'utf8', 'hex') + 
            crypto.createCipher('aes-256-cbc', ENCRYPTION_KEY).final('hex');
    }
    
    decrypt(encryptedMessage) {
        try {
            const decipher = crypto.createDecipher('aes-256-cbc', ENCRYPTION_KEY);
            return JSON.parse(decipher.update(encryptedMessage, 'hex', 'utf8') + 
                           decipher.final('utf8'));
        } catch (error) {
            return null;
        }
    }
}
```

### 4. 性能优化

#### 大文件传输优化
```javascript
class FileTransferManager {
    async transferFile(filePath, targetDevice) {
        const stats = fs.statSync(filePath);
        const chunkSize = 1024 * 1024; // 1MB chunks
        const totalChunks = Math.ceil(stats.size / chunkSize);
        
        for (let i = 0; i < totalChunks; i++) {
            const chunk = fs.createReadStream(filePath, {
                start: i * chunkSize,
                end: Math.min((i + 1) * chunkSize - 1, stats.size - 1)
            });
            
            await this.sendChunk(chunk, i, totalChunks, targetDevice);
            this.updateProgress(i + 1, totalChunks);
        }
    }
    
    updateProgress(current, total) {
        const progress = (current / total) * 100;
        this.broadcast({
            type: 'file_transfer',
            action: 'progress',
            progress: progress
        });
    }
}
```

#### 屏幕镜像压缩优化
```javascript
class ScreenCapture {
    async captureAndCompress() {
        const screenshot = await this.captureScreen();
        const compressed = await this.compressImage(screenshot);
        return compressed;
    }
    
    async compressImage(imageBuffer) {
        return new Promise((resolve, reject) => {
            sharp(imageBuffer)
                .resize(1280, 720, { fit: 'inside' })
                .jpeg({ quality: 80 })
                .toBuffer()
                .then(resolve)
                .catch(reject);
        });
    }
}
```
# Windows-Android Connect

一个功能完整的Windows-Android局域网互联软件，实现设备发现、文件传输、屏幕投屏、远程控制、剪贴板同步和通知同步等核心功能。

## 功能特性

- ✅ 局域网自动发现设备
- ✅ 文件传输（支持大文件和断点续传）
- ✅ 屏幕投屏（实时屏幕镜像，低延迟）
- ✅ 远程控制（鼠标键盘控制Android设备）
- ✅ 剪贴板同步（双向内容共享）
- ✅ 通知同步（Windows端显示Android通知）

## 技术架构

### 整体架构
```
┌─────────────────┐    HTTP/WS代理    ┌──────────────────┐
│   Web前端UI      │◄────────────────►│  Vite开发服务器    │
│  (React + WS)    │                 │    (端口3000)     │
└─────────────────┘                 └─────────┬────────┘
                                              │ WebSocket
                                              ▼
                                  ┌──────────────────────┐
                                  │   Node.js主服务器     │
                                  │   (端口8828 WS)     │
                                  └─────────┬────────────┘
                                            │ TCP Socket
                                            ▼
                                ┌─────────────────────────┐
                                │      Android客户端       │
                                │        (Kotlin)         │
                                └─────────────────────────┘
```

### 技术栈
- 前端：Vite + React + WebSocket
- 后端：Node.js + Express + WebSocket (ws)
- 开发代理：Vite Proxy (端口3000 → 8828)
- Android端：Kotlin
- 通信协议：WebSocket + TCP Socket + UDP广播

## 快速开始

### 环境要求
- Windows 10/11
- Android 7.0+
- Node.js 14+
- Android Studio

### 安装步骤

1. 克隆项目：
```bash
git clone <repository-url>
cd windows-android-connect
```

2. 安装依赖：
```bash
npm install
```

3. 构建Android应用：
```bash
cd app
./gradlew build
```

4. 启动主服务器：
```bash
npm run server
```

5. 启动Vite开发服务器：
```bash
npm run dev:vite
```

6. 在Android设备上安装APK并启动应用

### 使用说明

1. 确保Windows和Android设备在同一个局域网中
2. 启动主服务器（端口8828）和Vite开发服务器（端口3000）
3. 在Android设备上启动应用并连接到Windows设备
4. 访问 http://localhost:3000 控制Android设备

## 开发指南

### 项目结构
```
├── app/                          # Android客户端
├── src/                          # Web前端源码
│   ├── App.jsx                   # 主React组件
│   ├── services/                 # 服务模块
│   │   └── websocket-service.js  # WebSocket服务
│   └── server/                   # 服务端代码
│       └── core/                 # 核心服务器
├── complete-server.js            # Node.js主服务器
├── vite-config.js                # Vite配置（含代理设置）
├── src/services/websocket-service.js  # 前端WebSocket服务
└── package.json                  # 项目配置
```

### 核心模块

1. **设备发现模块**（UDP 8090端口）
   - 局域网扫描
   - 设备认证
   - 状态管理

2. **文件传输模块**（WebSocket 8828端口）
   - 文件选择与发送
   - 接收与保存
   - 进度监控

3. **屏幕投屏模块**（WebSocket 8828端口）
   - 屏幕捕获
   - 视频编码
   - 实时传输

4. **远程控制模块**（WebSocket 8828端口）
   - 输入事件捕获
   - 事件传输
   - 事件执行

5. **同步模块**（WebSocket 8828端口）
   - 剪贴板同步
   - 通知同步

## 端口说明

- **8828**: 主WebSocket服务器端口
- **8090**: UDP设备发现广播端口
- **3000**: Vite开发服务器端口（通过代理转发WebSocket请求到8828端口）

## 贡献指南

1. Fork项目
2. 创建功能分支
3. 提交更改
4. 发起Pull Request

## 许可证

MIT License

## 联系方式

如有问题，请提交Issue或联系开发团队。
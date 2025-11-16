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
┌─────────────────┐    WebSocket    ┌──────────────────┐
│   Web前端UI      │◄───────────────►│  Node.js服务器    │
│  (Vite + React)  │                 │ (Socket.IO服务)   │
└─────────────────┘                 └─────────┬────────┘
                                              │ TCP Socket
                                              ▼
                                  ┌──────────────────────┐
                                  │   Android客户端       │
                                  │     (Kotlin)         │
                                  └──────────────────────┘
```

### 技术栈
- 前端：Vite + React
- 后端：Node.js + WebSocket
- Android端：Kotlin
- 通信协议：WebSocket + TCP Socket

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

4. 启动服务器：
```bash
npm start
```

5. 在Android设备上安装APK并启动应用

### 使用说明

1. 确保Windows和Android设备在同一个局域网中
2. 启动Windows端服务器
3. 在Android设备上启动应用
4. 设备会自动发现并连接
5. 通过Web界面控制Android设备

## 开发指南

### 项目结构
```
├── app/                 # Android客户端
├── src/                 # Web前端源码
├── websocket-server.js  # WebSocket服务器
├── full-integrated-server.js  # 集成服务器
└── package.json         # 项目配置
```

### 核心模块

1. **设备发现模块**
   - 局域网扫描
   - 设备认证
   - 状态管理

2. **文件传输模块**
   - 文件选择与发送
   - 接收与保存
   - 进度监控

3. **屏幕投屏模块**
   - 屏幕捕获
   - 视频编码
   - 实时传输

4. **远程控制模块**
   - 输入事件捕获
   - 事件传输
   - 事件执行

5. **同步模块**
   - 剪贴板同步
   - 通知同步

## 贡献指南

1. Fork项目
2. 创建功能分支
3. 提交更改
4. 发起Pull Request

## 许可证

MIT License

## 联系方式

如有问题，请提交Issue或联系开发团队。
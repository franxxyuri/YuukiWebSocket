# Windows-Android互联软件

# Windows-Android Connect

一个功能完整的Windows-Android局域网互联软件，使用Vite + React构建Web应用。

## 主要功能

- 局域网自动发现设备
- 文件传输
- 屏幕投屏
- 远程控制
- 剪贴板同步
- 通知同步

## 技术栈

- Vite
- React
- Node.js
- Socket.io
- WebSocket

## 项目结构

```
.
├── src/                 # 前端源代码
├── app/                 # Android应用源代码
├── dist/                # 构建输出目录
├── public/              # 静态资源
├── package.json         # 项目配置
├── vite.config.js       # Vite配置
├── web-server.js        # Web服务器
└── README.md            # 项目说明
```

## 开发环境搭建

1. 安装依赖:
   ```bash
   npm install
   ```

2. 启动开发服务器:
   ```bash
   npm run dev
   ```

3. 启动WebSocket服务器:
   ```bash
   node web-server.js
   ```

4. 构建项目:
   ```bash
   npm run build
   ```

## Android应用构建

```bash
cd app
./gradlew build
```

## 项目架构说明

本项目采用前后端分离架构：

### 前端 (Vite + React)
- 使用Vite作为构建工具，提供快速的开发体验
- React作为UI框架
- WebSocket与后端通信

### 后端 (Node.js + Socket.io)
- Node.js提供WebSocket服务器
- Socket.io处理实时通信
- 与Android应用通过TCP Socket通信

### Android应用
- 作为服务端接收控制指令
- 提供屏幕投屏和文件传输功能

## 项目特性

### 核心功能
- ✅ **文件传输** - 高速、安全的局域网文件传输
- ✅ **屏幕投屏** - 实时、高清的Android屏幕镜像
- ✅ **远程控制** - 使用鼠标键盘控制Android设备
- ✅ **通知同步** - 在Windows端显示Android通知
- ✅ **剪贴板同步** - 双向剪贴板内容共享

### 技术特点
- 🏗️ **现代化架构** - 基于Vite + React + Kotlin技术栈
- 🔒 **安全加密** - 端到端AES-256加密传输
- ⚡ **高性能** - 超低延迟屏幕投屏和文件传输
- 🌐 **跨平台** - 支持Windows 10/11和Android 7.0+
- 🔧 **易扩展** - 模块化架构，便于功能扩展

## 项目结构

```
windows-android-connect/
├── src/                    # 前端源代码 (React + Vite)
├── android-client/         # Android客户端 (Kotlin)
├── docs/                   # 项目文档
└── README.md              # 项目说明
```

## 开发路线图

### Phase 1: MVP开发 (4-6周)
- [ ] 基础框架搭建
- [ ] 设备发现与连接
- [ ] 文件传输功能
- [ ] 屏幕投屏功能

### Phase 2: 功能完善 (4-6周)
- [ ] 远程控制功能
- [ ] 通知同步
- [ ] 剪贴板同步
- [ ] 音频传输
- [ ] UI/UX优化

### Phase 3: 优化与发布 (2-3周)
- [ ] 性能优化
- [ ] 稳定性测试
- [ ] 打包发布

## 技术文档

- [技术架构设计](技术架构设计.md)
- [竞品分析](Windows-Android-互联应用竞品分析.md)

## 快速开始

### Web客户端
```bash
# 使用批处理文件启动（推荐）
start-web.bat

# 或者使用命令行启动
npm install
npm run server  # 启动WebSocket服务器
npm run dev     # 启动Vite开发服务器
```

### Android客户端
```bash
cd app
# 打开Android Studio
# 同步Gradle项目
# 构建APK
```

## 开发环境要求

### Windows端
- Node.js 18+
- npm 9+
- Vite 5+

### Android端
- Android Studio
- JDK 11+
- Android SDK API 24+
- Kotlin 1.8+

## 许可证

MIT License

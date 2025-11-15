# Windows-Android互联软件

一个功能完整的Windows-Android局域网互联软件，支持文件传输、屏幕投屏、远程控制、通知同步、剪贴板同步等功能。

## 项目特性

### 核心功能
- ✅ **文件传输** - 高速、安全的局域网文件传输
- ✅ **屏幕投屏** - 实时、高清的Android屏幕镜像
- ✅ **远程控制** - 使用鼠标键盘控制Android设备
- ✅ **通知同步** - 在Windows端显示Android通知
- ✅ **剪贴板同步** - 双向剪贴板内容共享

### 技术特点
- 🏗️ **现代化架构** - 基于Electron + React + Kotlin技术栈
- 🔒 **安全加密** - 端到端AES-256加密传输
- ⚡ **高性能** - 超低延迟屏幕投屏和文件传输
- 🌐 **跨平台** - 支持Windows 10/11和Android 7.0+
- 🔧 **易扩展** - 模块化架构，便于功能扩展

## 项目结构

```
windows-android-connect/
├── windows-client/         # Windows客户端 (Electron + React)
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

### Windows客户端
```bash
cd windows-client
npm install
npm run dev
```

### Android客户端
```bash
cd android-client
# 打开Android Studio
# 同步Gradle项目
# 构建APK
```

## 开发环境要求

### Windows端
- Node.js 18+
- npm 9+
- Electron 28+

### Android端
- Android Studio
- JDK 11+
- Android SDK API 24+
- Kotlin 1.8+

## 许可证

MIT License

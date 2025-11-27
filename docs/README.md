# Windows-Android Connect 项目文档

## 核心文档 (仅保留以下4个文档)

- **[USER-MANUAL.md](USER-MANUAL.md)** - 用户手册（包含快速启动、端口配置、常见问题等）
- **[TECHNICAL-DOC.md](TECHNICAL-DOC.md)** - 技术文档（包含通信协议、消息类型等）
- **[ARCHITECTURE.md](ARCHITECTURE.md)** - 系统架构说明
- **[DEVELOPMENT-PLAN.md](DEVELOPMENT-PLAN.md)** - 开发计划和启动脚本优化

## 项目信息

**主要功能**：
- 局域网设备发现
- 文件传输和屏幕投屏
- 远程控制和剪贴板同步
- 通知同步

**技术栈**：
- 前端：React + WebSocket
- 后端：Node.js + Express
- Android：Kotlin
- 通信：WebSocket + UDP

**快速启动**：
```bash
# 运行主启动器
start.bat

# 或直接使用脚本
scripts\start-unified.bat dev
```
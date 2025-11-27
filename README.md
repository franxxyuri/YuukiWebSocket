# Windows-Android Connect

Windows-Android局域网互联软件，实现设备发现、文件传输、屏幕投屏等功能。

## 快速启动

```bash
# 运行主启动器
start.bat

# 或直接使用脚本
scripts\start-unified.bat dev
```

## 主要功能

- ✅ 设备自动发现
- ✅ 文件传输
- ✅ 屏幕投屏
- ✅ 远程控制
- ✅ 剪贴板同步

## 端口配置

- WebSocket主服务: 8928
- Vite前端服务: 8781
- 设备发现服务: 8190

## 项目结构

```
├── scripts/        # 启动脚本
├── docs/           # 项目文档
├── backend/        # 后端服务
├── frontend/       # 前端资源
├── src/           # 源代码
└── app/           # Android应用
```

## 文档 (精简版)

为简化开发，文档已精简为4个核心文档：

- **[用户手册](docs/USER-MANUAL.md)** - 快速开始、启动说明和常见问题
- **[技术文档](docs/TECHNICAL-DOC.md)** - 通信协议和API说明
- **[架构说明](docs/ARCHITECTURE.md)** - 系统架构和设计决策
- **[开发计划](docs/DEVELOPMENT-PLAN.md)** - 开发路线图和脚本优化
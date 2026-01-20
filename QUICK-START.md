# Windows-Android Connect - 快速开始指南

## 项目概述

Windows-Android Connect 是一个跨平台远程控制和文件传输解决方案，支持：
- 📁 文件传输（支持断点续传）
- 🖥️ 屏幕镜像（实时流传输）
- 🖱️ 远程控制（鼠标、键盘、触摸）
- 📊 性能监控和日志记录

## 系统要求

- **Node.js**: v16 或更高版本
- **npm**: v7 或更高版本
- **Windows**: Windows 10 或更高版本
- **Android**: Android 8.0 或更高版本

## 快速启动

### 1. 安装依赖

```bash
npm install
```

### 2. 启动开发环境

**方式一：使用批处理脚本（Windows）**
```bash
start-dev.bat
```

**方式二：手动启动**

打开两个终端窗口：

终端1 - 启动后端服务器：
```bash
npm start
```

终端2 - 启动前端开发服务器：
```bash
npm run dev:vite
```

### 3. 访问应用

- **前端**: http://localhost:5173
- **后端 API**: http://localhost:3000

## 常用命令

### 开发

```bash
# 启动开发环境
npm run dev

# 启动前端开发服务器
npm run dev:vite

# 启动集成开发服务器
npm run dev:integrated
```

### 测试

```bash
# 运行所有测试
npm test

# 运行单元测试
npm run test:unit

# 生成覆盖率报告
npm run test:coverage

# 监视模式运行测试
npm run test:watch
```

### 构建

```bash
# 构建前端
npm run build

# 预览构建结果
npm run preview

# 构建Android应用
npm run android-build
```

### 停止服务

```bash
# 使用批处理脚本（Windows）
stop-server.bat

# 或手动停止：按 Ctrl+C
```

## 项目结构

```
.
├── backend/              # Node.js后端服务
│   ├── src/
│   │   ├── services/     # 核心服务（文件传输、屏幕镜像、远程控制）
│   │   ├── utils/        # 工具类（连接管理、监控、日志）
│   │   └── types/        # TypeScript类型定义
│   └── tests/
│       └── unit/         # 单元测试
├── frontend/             # React前端应用
│   ├── src/
│   │   ├── components/   # React组件
│   │   ├── services/     # 前端服务
│   │   └── styles/       # 样式文件
│   └── tests/            # 前端测试
├── app/                  # Android应用
│   └── src/
│       └── main/java/    # Kotlin源代码
└── .kiro/specs/          # 项目规范和设计文档
```

## 功能特性

### 文件传输
- ✅ 支持大文件传输（最大10GB）
- ✅ 断点续传能力
- ✅ SHA-256完整性验证
- ✅ 实时进度更新

### 屏幕镜像
- ✅ 30 FPS实时流传输
- ✅ H.264压缩
- ✅ 自适应质量调整
- ✅ 自动重连机制

### 远程控制
- ✅ 鼠标和键盘输入
- ✅ 触摸手势识别
- ✅ 事件批处理
- ✅ 低延迟传输

### 性能优化
- ✅ 连接池管理
- ✅ 内存优化
- ✅ CPU使用率控制
- ✅ 带宽自适应

## 配置

### 环境变量

创建 `.env` 文件（参考 `.env.example`）：

```env
# 后端配置
BACKEND_PORT=3000
BACKEND_HOST=0.0.0.0

# 前端配置
VITE_API_URL=http://localhost:3000

# 日志级别
LOG_LEVEL=INFO
```

## 故障排除

### 端口被占用

如果端口3000或5173已被占用，可以修改 `package.json` 中的启动命令或使用环境变量指定不同的端口。

### Node.js版本问题

确保使用Node.js v16或更高版本：
```bash
node --version
```

### 依赖安装失败

清除缓存并重新安装：
```bash
npm cache clean --force
rm -rf node_modules package-lock.json
npm install
```

## 测试

项目使用Jest进行单元测试和属性基测试（Property-Based Testing）。

运行测试：
```bash
npm test
```

查看测试覆盖率：
```bash
npm run test:coverage
```

## 文档

- [设计文档](./docs/ARCHITECTURE.md) - 系统架构设计
- [API文档](./docs/README.md) - API参考
- [规范文档](./.kiro/specs/) - 功能规范和设计

## 许可证

MIT

## 支持

如有问题或建议，请提交Issue或Pull Request。

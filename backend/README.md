# Backend 目录结构说明

本目录包含Windows-Android Connect项目的所有后端服务器文件和工具。

## 📁 目录结构

```
backend/
├── scripts/                 # 服务器脚本文件
│   ├── websocket-server.js
│   ├── integrated-server.js
│   ├── complete-server.js
│   ├── full-integrated-server.js
│   ├── simple-integrated-server.js
│   ├── integrated-vite-server.js
│   ├── simple-server.js
│   ├── web-server.js
│   ├── debug-server.js
│   ├── start-*.js            # 各种启动脚本
│   ├── check-*.js            # 检查脚本
│   └── run-demo.js
├── config/                  # 配置文件
│   ├── config.js
│   ├── vite-config.js
│   └── config.mjs
├── utils/                   # 工具类文件
│   ├── device-discovery.js
│   ├── network-communication.js
│   └── mock-device.js
└── tests/                    # 测试文件
    ├── test-android-connection.js
    ├── test-client.js
    ├── test-connection.js
    ├── test-improved-client.js
    ├── test-modules.js
    ├── test-network-*.js
    ├── test-runner.js
    ├── test-server-*.js
    └── test-websocket-*.js
```

## 🚀 使用说明

### 启动服务器
```bash
# 使用完整集成服务器
node backend/scripts/integrated-vite-server.js

# 使用简单服务器
node backend/scripts/simple-server.js

# 使用WebSocket服务器
node backend/scripts/websocket-server.js
```

### 运行测试
```bash
# 测试连接
node backend/tests/test-connection.js

# 测试服务器功能
node backend/tests/test-server-functions.js

# 测试WebSocket连接
node backend/tests/test-websocket-client.js
```

### 配置管理
- `config/config.js` - 通用配置
- `config/vite-config.js` - Vite开发服务器配置
- `config/config.mjs` - ES模块配置文件

## 📝 注意事项

- 所有服务器文件的路径已更新以适应新的目录结构
- 启动脚本可能需要相应更新路径引用
- 测试文件现在集中在 `tests/` 目录中，便于管理
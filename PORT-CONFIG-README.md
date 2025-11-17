# Windows-Android Connect 端口配置说明

## 概述

本项目支持端口配置化，允许您根据需要自定义各种服务端口。所有端口配置都通过配置文件和环境变量管理。

## 配置文件

### config.mjs
主要配置文件，包含所有端口和服务配置：
- `config.server.port` - 主WebSocket服务器端口 (默认: 8828)
- `config.vite.port` - Vite开发服务器端口 (默认: 8080)
- `config.discovery.port` - 设备发现UDP端口 (默认: 8090)
- `config.debug.port` - 调试服务器端口 (默认: 8081)

### .env
环境变量配置文件：
```
# 服务端口配置
SERVER_PORT=8828
SERVER_HOST=0.0.0.0

# Vite开发服务器端口配置
VITE_PORT=8080
VITE_HOST=0.0.0.0

# 设备发现端口配置
DISCOVERY_PORT=8090

# 调试端口配置
DEBUG_PORT=8081

# 代理目标配置
PROXY_TARGET=ws://localhost:8828
API_TARGET=http://localhost:8828
```

## 配置方式

### 方式1: 修改 .env 文件
直接编辑 `.env` 文件中的端口号，然后启动服务:

```bash
npm run dev:config
```

### 方式2: 使用环境变量
在启动时设置环境变量:

```bash
SERVER_PORT=9999 VITE_PORT=9998 npm run dev:config
```

### 方式3: 使用启动脚本
使用预设的启动脚本:

- `start-with-config.bat` - 支持参数的启动脚本
- `start-integrated-config.bat` - 启动集成服务器，使用配置文件中的端口

## 启动命令

### 开发环境
```bash
# 使用默认配置启动
npm run dev

# 使用配置文件和环境变量启动
npm run dev:config

# 启动Vite开发服务器
npm run dev:vite

# 启动集成服务器（包含前端代理）
npm run dev:integrated
```

### 生产环境
```bash
# 启动主服务
npm start

# 构建前端
npm run build
```

## 端口说明

| 端口 | 类型 | 功能 | 配置项 |
|------|------|------|--------|
| 8828 | TCP | 主WebSocket服务器 | SERVER_PORT |
| 8080 | TCP | Vite开发服务器 | VITE_PORT |
| 8090 | UDP | 设备发现服务 | DISCOVERY_PORT |
| 8081 | TCP | 调试服务器 | DEBUG_PORT |

## 注意事项

1. 确保指定的端口没有被其他服务占用
2. 端口号范围为 1-65535，建议使用 1024 以上的端口
3. 如果修改了主服务器端口，确保Vite配置中的代理目标也相应更新
4. 设备发现功能依赖UDP端口，确保防火墙允许相应端口的UDP通信

## 故障排除

如果遇到端口占用问题，可以使用以下命令检查:

```bash
# Windows
netstat -ano | findstr :<PORT_NUMBER>

# 查找占用端口的进程
tasklist | findstr <PID>
```
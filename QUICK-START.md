# 🚀 快速开始指南

## 30 秒启动你的项目！

### 步骤 1: 安装依赖（首次运行）

```bash
npm install
```

### 步骤 2: 启动服务

```bash
# 方式 1: 使用统一 CLI（推荐）
wac-cli dev

# 方式 2: 使用 npm
npm start

# 方式 3: 交互式菜单
wac-cli
```

### 步骤 3: 访问应用

打开浏览器访问：
- **前端**: http://localhost:8781
- **API**: http://localhost:8928/api
- **健康检查**: http://localhost:8928/health

---

## 🎯 常用命令

```bash
wac-cli start      # 启动服务（生产模式）
wac-cli dev        # 启动服务（开发模式）
wac-cli stop       # 停止服务
wac-cli restart    # 重启服务
wac-cli status     # 查看状态
wac-cli test       # 运行测试
wac-cli help       # 查看帮助
```

---

## 📊 服务状态

### 查看服务状态

```bash
# 命令行查看
wac-cli status

# API 查看
curl http://localhost:8928/api/status

# 健康检查
curl http://localhost:8928/health
```

### 查看性能统计

```bash
curl http://localhost:8928/api/performance
```

---

## 🔧 故障排查

### 问题 1: 端口被占用

```bash
# 停止所有服务
wac-cli stop

# 或手动清理
taskkill /F /IM node.exe
```

### 问题 2: 依赖问题

```bash
# 清理并重新安装
wac-cli clean
npm install
```

### 问题 3: 配置错误

```bash
# 运行配置测试
npm run test:fixes
```

---

## 📚 更多文档

- **SCRIPT-CLEANUP.md** - 脚本优化说明
- **OPTIMIZATION-GUIDE.md** - 优化功能使用
- **README.md** - 完整项目文档

---

## 🎉 就这么简单！

现在你可以开始开发了！

**需要帮助？** 运行 `wac-cli help` 查看所有可用命令。

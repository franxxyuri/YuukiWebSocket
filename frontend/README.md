# Frontend 目录结构说明

本目录包含Windows-Android Connect项目的所有前端文件。

## 📁 目录结构

```
frontend/
├── index.html              # 前端控制台主页
├── pages/                   # 页面文件
│   ├── index.html          # 主控制页面
│   ├── screen-stream.html  # 屏幕镜像页面
│   ├── react-index.html    # React应用入口
│   └── app-index.html      # 应用管理界面
├── components/              # React组件
│   ├── React-App.jsx       # 主React应用组件
│   └── react-main.jsx      # React主入口
├── styles/                  # 样式文件
│   └── app-styles.css      # 应用样式
├── utils/                   # 工具函数
│   ├── clipboard-sync.js   # 剪贴板同步
│   ├── file-transfer.js    # 文件传输
│   ├── notification-sync.js # 通知同步
│   ├── screen-display.js   # 屏幕显示
│   └── remote-controller.js # 远程控制
└── tests/                   # 测试页面
    ├── test-connection.html     # 连接测试
    ├── test-server-functions.html # 服务器功能测试
    ├── test-ui.html             # UI测试
    ├── test-android-client.html # Android客户端测试
    └── test-client-web.html     # Web客户端测试
```

## 🚀 访问方式

1. **前端控制台主页**: `http://localhost:8828/` 或 `http://localhost:8828/frontend/`
2. **屏幕镜像**: `http://localhost:8828/frontend/pages/screen-stream.html`
3. **React应用**: `http://localhost:8828/frontend/pages/react-index.html`
4. **测试页面**: `http://localhost:8828/frontend/tests/`

## 📝 使用说明

- 所有前端文件已从项目根目录移动到 `frontend/` 目录
- 服务器已配置静态文件服务，支持 `/frontend/` 路径访问
- 保持了原有的文件结构和功能不变
- 新增了统一的前端控制台主页，方便管理和导航

## 🔧 配置说明

服务器配置已更新：
- 添加了 `/frontend` 静态文件路由
- 主页路由指向新的前端控制台
- 保持了所有原有功能的兼容性
/**
 * 静态资源路由
 * 处理所有静态资源请求
 */

import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

// 解决 ES 模块中 __dirname 不可用的问题
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

// 静态文件服务
router.use('/frontend', express.static(path.join(__dirname, '../../../frontend')));
router.use('/src', express.static(path.join(__dirname, '../../../frontend/src')));
router.use('/public', express.static(path.join(__dirname, '../../../public')));
router.use('/assets', express.static(path.join(__dirname, '../../../frontend/assets')));
router.use(express.static(path.join(__dirname, '../../../frontend')));

// 处理src/main.jsx请求（特殊处理，指向不同目录）
router.get('/src/main.jsx', (req, res) => {
    const filePath = path.join(__dirname, '../../../src/main.jsx');
    res.setHeader('Content-Type', 'application/javascript');
    res.sendFile(filePath);
});

// 处理vite.svg请求
router.get('/vite.svg', (req, res) => {
    // 如果文件存在则返回，否则返回 404 或自定义响应
    const filePath = path.join(__dirname, '../../../frontend/vite.svg');
    res.sendFile(filePath, (err) => {
        if (err) {
            // 返回一个简单的 SVG 作为默认图标
            res.type('image/svg+xml');
            res.send('<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100"><rect width="100" height="100" fill="#60a5fa"/><text x="50" y="50" text-anchor="middle" dominant-baseline="middle" fill="white" font-size="16">WAC</text></svg>');
        }
    });
});

// 捕获所有其他路由并返回 index.html（支持 React Router 等客户端路由）
// 通用路由 - 所有其他非API请求返回 index.html（SPA 路由回退）
// 注意：这个路由必须放在所有特定路由之后
router.get(/^(?!\/api\/)(?!\/pages\/).*$/, (req, res) => {
    // 检查是否为可能的静态资源请求（包含文件扩展名）
    if (req.path.includes('.')) {
        // 如果是静态资源请求但未被中间件处理，则返回404
        res.status(404).send('File not found');
        return;
    }
    // 其他所有路由都返回 index.html，让前端路由处理
    res.sendFile(path.join(__dirname, '../../../frontend/index.html'));
});

export default router;

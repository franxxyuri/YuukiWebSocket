/**
 * 页面路由
 * 处理所有页面请求
 */

import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

// 解决 ES 模块中 __dirname 不可用的问题
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

// 页面路由 - 明确处理特定页面请求
router.get(['/', '/index'], (req, res) => {
    res.sendFile(path.join(__dirname, '../../../frontend/pages/index.html'));
});

router.get('/:page', (req, res) => {
    const page = req.params.page;
    // 防止路径遍历攻击
    if (page.includes('..')) {
        return res.status(403).send('Forbidden');
    }
    const pagePath = path.join(__dirname, '../../../frontend/pages', page);
    res.sendFile(pagePath, (err) => {
        if (err) {
            res.status(404).send('Page not found');
        }
    });
});

export default router;

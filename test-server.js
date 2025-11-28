const express = require('express');
const path = require('path');
const app = express();
const PORT = 3005;

// 简单的静态文件服务
app.use('/frontend', express.static('../../frontend'));
app.use('/src', express.static('../../src'));
app.use(express.static('../../frontend'));

// 简单路由
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../../frontend/index.html'));
});

app.get('/pages/:page', (req, res) => {
    const page = req.params.page;
    const pagePath = path.join(__dirname, `../../frontend/pages/${page}`);
    res.sendFile(pagePath, (err) => {
        if (err) {
            res.status(404).send('Page not found');
        }
    });
});

// 通用路由 - 所有其他非API请求返回 index.html
app.get(/^(?!\/api\/).*$/, (req, res) => {
    res.sendFile(path.join(__dirname, '../../frontend/index.html'));
});

app.listen(PORT, () => {
    console.log(`Test server running on http://localhost:${PORT}`);
});
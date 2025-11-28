import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './React-App';
// 导入样式文件
import '../src/styles/global.css';
import '../src/styles/animations.css';
import '../src/styles/responsive.css';

// 创建React根节点
const root = ReactDOM.createRoot(document.getElementById('root'));

// 渲染应用
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
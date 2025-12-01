import React from 'react';
import ReactDOM from 'react-dom/client';
import { RouterProvider } from 'react-router-dom';
import router from './routes/index.jsx';
// 导入样式文件
import './styles/global.css';
import './styles/animations.css';
import './styles/responsive.css';

// 创建React根节点
const root = ReactDOM.createRoot(document.getElementById('root'));

// 渲染应用
root.render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>
);
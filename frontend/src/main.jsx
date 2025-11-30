import React from 'react';
import ReactDOM from 'react-dom/client';
import { RouterProvider } from 'react-router-dom';
import router from './routes';
// 导入样式文件
import './styles/global.css';
import './styles/animations.css';
import './styles/responsive.css';
// 导入错误边界组件
import ErrorBoundary from '../components/ErrorBoundary';

// 创建React根节点
const root = ReactDOM.createRoot(document.getElementById('root'));

// 渲染应用
root.render(
  <React.StrictMode>
    <ErrorBoundary>
      <RouterProvider router={router} />
    </ErrorBoundary>
  </React.StrictMode>
);
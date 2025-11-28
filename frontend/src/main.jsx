import React from 'react';
import ReactDOM from 'react-dom/client';
import App from '../components/React-App';
// 导入样式文件
import './styles/global.css';
import './styles/animations.css';
import './styles/responsive.css';

// 创建React根节点
const root = ReactDOM.createRoot(document.getElementById('root'));

// 渲染应用
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
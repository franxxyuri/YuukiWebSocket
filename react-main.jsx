import React from 'react';
import ReactDOM from 'react-dom/client';
import { ConfigProvider } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import App from './App.jsx';
import './index.css';

// 创建React根节点
const root = ReactDOM.createRoot(document.getElementById('root'));

// 检查Electron API是否可用
if (typeof window.electronAPI !== 'undefined') {
  console.log('Electron API 可用，开始渲染React应用...');
  
  // 渲染应用
  root.render(
    <React.StrictMode>
      <ConfigProvider 
        locale={zhCN}
        theme={{
          token: {
            colorPrimary: '#1890ff',
            borderRadius: 6,
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji"'
          },
          components: {
            Layout: {
              bodyBg: '#f5f5f5',
              headerBg: '#001529',
              siderBg: '#001529'
            }
          }
        }}
      >
        <App />
      </ConfigProvider>
    </React.StrictMode>
  );
} else {
  // 开发模式或在浏览器中运行
  console.log('开发模式或在浏览器中运行，使用基础HTML应用');
  // 这里可以渲染一个基础版本或者提示用户
}
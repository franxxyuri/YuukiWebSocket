import React from 'react';
import { createBrowserRouter } from 'react-router-dom';

// 动态导入组件
const Dashboard = React.lazy(() => import('../../components/Dashboard'));
const DeviceDiscovery = React.lazy(() => import('../../components/DeviceDiscovery'));
const FileTransfer = React.lazy(() => import('../../components/FileTransfer'));
const ScreenShare = React.lazy(() => import('../../components/ScreenShare'));
const RemoteControl = React.lazy(() => import('../../components/RemoteControl'));
const ConfigurationPage = React.lazy(() => import('../../components/ConfigurationPage'));
const DebugPage = React.lazy(() => import('../../components/DebugPage'));
const ErrorBoundary = React.lazy(() => import('../../components/ErrorBoundary'));

// 布局组件
const AppLayout = React.lazy(() => import('../../components/AppLayout'));

// 错误组件
const ErrorPage = () => (
  <ErrorBoundary>
    <div style={{ 
      display: 'flex', 
      justifyContent: 'center', 
      alignItems: 'center', 
      minHeight: '80vh',
      padding: '20px'
    }}>
      <h1>页面出错了，请刷新重试</h1>
    </div>
  </ErrorBoundary>
);

const router = createBrowserRouter([
  {
    path: '/',
    element: <AppLayout />,
    errorElement: <ErrorPage />,
    children: [
      {
        index: true,
        element: <Dashboard />,
        errorElement: <ErrorPage />,
      },
      {
        path: 'devices',
        element: <DeviceDiscovery />,
        errorElement: <ErrorPage />,
      },
      {
        path: 'file-transfer',
        element: <FileTransfer />,
        errorElement: <ErrorPage />,
      },
      {
        path: 'screen-share',
        element: <ScreenShare />,
        errorElement: <ErrorPage />,
      },
      {
        path: 'remote-control',
        element: <RemoteControl />,
        errorElement: <ErrorPage />,
      },
      {
        path: 'settings',
        element: <ConfigurationPage />,
        errorElement: <ErrorPage />,
      },
      {
        path: 'debug',
        element: <DebugPage />,
        errorElement: <ErrorPage />,
      },
    ],
  },
  // 添加对/pages/react-index.html路径的支持
  {
    path: '/pages/react-index.html',
    element: <AppLayout />,
    errorElement: <ErrorPage />,
    children: [
      {
        index: true,
        element: <Dashboard />,
        errorElement: <ErrorPage />,
      },
      {
        path: 'devices',
        element: <DeviceDiscovery />,
        errorElement: <ErrorPage />,
      },
      {
        path: 'file-transfer',
        element: <FileTransfer />,
        errorElement: <ErrorPage />,
      },
      {
        path: 'screen-share',
        element: <ScreenShare />,
        errorElement: <ErrorPage />,
      },
      {
        path: 'remote-control',
        element: <RemoteControl />,
        errorElement: <ErrorPage />,
      },
      {
        path: 'settings',
        element: <ConfigurationPage />,
        errorElement: <ErrorPage />,
      },
      {
        path: 'debug',
        element: <DebugPage />,
        errorElement: <ErrorPage />,
      },
    ],
  },
  // 全局错误处理
  {
    path: '*',
    element: <ErrorPage />,
  },
]);

export default router;
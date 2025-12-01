import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';


// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  base: './',
  root: path.resolve(__dirname, '../../frontend'), // 设置为frontend目录
  publicDir: path.resolve(__dirname, '../../frontend/public'),
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: {
        main: path.resolve(__dirname, '../../frontend/index.html')
      }
    }
  },
  server: {
    port: process.env.VITE_PORT || 8081,
    open: true,
    host: process.env.VITE_HOST || '0.0.0.0',
    strictPort: false,
    proxy: {
      // 将WebSocket请求代理到后端服务器
      '/ws': {
        target: process.env.PROXY_TARGET || 'ws://localhost:9928',
        ws: true,
        changeOrigin: true
      },
      // 代理所有API请求到后端服务器
      '/api': {
        target: process.env.API_TARGET || 'http://localhost:9928',
        changeOrigin: true
      },
      // 代理设备发现相关请求
      '/device-discovery': {
        target: process.env.API_TARGET || 'http://localhost:9928',
        changeOrigin: true
      },
      // 代理屏幕流相关请求
      '/screen-stream': {
        target: process.env.API_TARGET || 'http://localhost:9928',
        changeOrigin: true
      },
      // 代理文件传输相关请求
      '/file-transfer': {
        target: process.env.API_TARGET || 'http://localhost:9928',
        changeOrigin: true
      },
      // 代理远程控制相关请求
      '/remote-control': {
        target: process.env.API_TARGET || 'http://localhost:9928',
        changeOrigin: true
      }
    }
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '../../frontend/src'),
      '@components': path.resolve(__dirname, '../../frontend/components'),
      '@pages': path.resolve(__dirname, '../../frontend/pages'),
      '@utils': path.resolve(__dirname, '../../frontend/utils'),
      '@hooks': path.resolve(__dirname, '../../frontend/src/hooks'),
      '@services': path.resolve(__dirname, '../../frontend/src/services'),
      '@store': path.resolve(__dirname, '../../frontend/src/store'),
      '@types': path.resolve(__dirname, '../../frontend/src/types'),
      // 添加React相关别名
      'react': path.resolve(__dirname, '../../node_modules/react'),
      'react-dom': path.resolve(__dirname, '../../node_modules/react-dom'),
      'react/jsx-runtime': path.resolve(__dirname, '../../node_modules/react/jsx-runtime'),
      'react/jsx-dev-runtime': path.resolve(__dirname, '../../node_modules/react/jsx-dev-runtime')
    }
  },
  define: {
    'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'development')
  }
});
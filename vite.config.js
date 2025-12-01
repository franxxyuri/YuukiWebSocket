import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react({
    // 添加额外的React插件配置
    jsxRuntime: 'automatic',
    include: /\.(jsx|tsx)$/,
    exclude: /node_modules/
  })],
  server: {
    port: parseInt(process.env.VITE_PORT) || 8781,
    host: '0.0.0.0',
    strictPort: false,
    proxy: {
      // 将WebSocket请求代理到后端服务器
      '/ws': {
        target: `http://localhost:${parseInt(process.env.SERVER_PORT) || 8928}`,
        ws: true,
        changeOrigin: true
      },
      // 代理API请求
      '/api': {
        target: `http://localhost:${parseInt(process.env.SERVER_PORT) || 8928}`,
        changeOrigin: true
      },
      // 代理设备相关API端点
      '/device': {
        target: `http://localhost:${parseInt(process.env.SERVER_PORT) || 8928}`,
        changeOrigin: true
      }
    }
  },
  root: path.resolve(__dirname, 'frontend'),
  publicDir: path.resolve(__dirname, 'frontend/public'),
  build: {
    outDir: path.resolve(__dirname, 'dist'),
    rollupOptions: {
      input: {
        main: path.resolve(__dirname, 'frontend/index.html')
      }
    }
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'frontend/src'),
      '@components': path.resolve(__dirname, 'frontend/components'),
      '@pages': path.resolve(__dirname, 'frontend/pages'),
      '@utils': path.resolve(__dirname, 'frontend/utils'),
      '@hooks': path.resolve(__dirname, 'frontend/hooks'),
      '@services': path.resolve(__dirname, 'frontend/services'),
      '@store': path.resolve(__dirname, 'frontend/store'),
      '@types': path.resolve(__dirname, 'frontend/types')
    }
  }
});
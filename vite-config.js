import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  base: './',
  root: '.',
  publicDir: 'public',
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: {
        main: path.resolve(__dirname, 'index.html'),
        test: path.resolve(__dirname, 'test-ui.html'),
        screen: path.resolve(__dirname, 'screen-stream.html')
      }
    }
  },
  server: {
    port: 3000,
    open: true,
    host: '0.0.0.0',
    strictPort: false,
    proxy: {
      // 将WebSocket请求代理到后端服务器
      '/ws': {
        target: 'ws://localhost:8828',
        ws: true,
        changeOrigin: true
      },
      // 如果需要，也可以代理其他API请求
      '/api': {
        target: 'http://localhost:8828',
        changeOrigin: true
      }
    }
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@components': path.resolve(__dirname, './src/components'),
      '@pages': path.resolve(__dirname, './src/pages'),
      '@utils': path.resolve(__dirname, './src/utils'),
      '@hooks': path.resolve(__dirname, './src/hooks'),
      '@services': path.resolve(__dirname, './src/services'),
      '@store': path.resolve(__dirname, './src/store'),
      '@types': path.resolve(__dirname, './src/types')
    }
  },
  define: {
    'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'development')
  },
  optimizeDeps: {
    include: ['react', 'react-dom', 'socket.io-client']
  }
});
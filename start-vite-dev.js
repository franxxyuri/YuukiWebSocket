import { createServer } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// 创建Vite开发服务器
async function startDevServer() {
  const server = await createServer({
    plugins: [react()],
    base: './',
    root: '.',
    publicDir: 'public',
    server: {
      port: 3000,
      host: '0.0.0.0',
      strictPort: false,
      open: true
    },
    resolve: {
      alias: {
        '@': path.resolve(process.cwd(), './src'),
        '@components': path.resolve(process.cwd(), './src/components'),
        '@pages': path.resolve(process.cwd(), './src/pages'),
        '@utils': path.resolve(process.cwd(), './src/utils'),
        '@hooks': path.resolve(process.cwd(), './src/hooks'),
        '@services': path.resolve(process.cwd(), './src/services'),
        '@store': path.resolve(process.cwd(), './src/store'),
        '@types': path.resolve(process.cwd(), './src/types')
      }
    },
    define: {
      'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'development')
    },
    optimizeDeps: {
      include: ['react', 'react-dom', 'socket.io-client']
    }
  });

  await server.listen();
  console.log('Vite开发服务器已启动');
  console.log('主页面: http://localhost:3000');
  console.log('测试页面: http://localhost:3000/test-ui.html');
  console.log('屏幕投屏页面: http://localhost:3000/screen-stream.html');
  console.log('按 Ctrl+C 停止服务器');
}

// 启动服务器
startDevServer().catch(err => {
  console.error('启动开发服务器时出错:', err);
  process.exit(1);
});
const NetworkCommunication = require('./network-communication.js');

console.log('Testing NetworkCommunication module...');

try {
  const nc = new NetworkCommunication();
  console.log('NetworkCommunication instance created successfully');
  
  // 尝试启动服务器
  nc.startServer(8826)
    .then(() => {
      console.log('Server started on port 8826');
      
      // 5秒后关闭服务器
      setTimeout(() => {
        nc.destroy();
        console.log('Server stopped');
        process.exit(0);
      }, 5000);
    })
    .catch(err => {
      console.error('Failed to start server:', err);
      process.exit(1);
    });
} catch (error) {
  console.error('Error creating NetworkCommunication instance:', error);
  process.exit(1);
}
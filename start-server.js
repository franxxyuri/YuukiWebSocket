import WebSocketServer from './websocket-server.js';

console.log('Starting Windows-Android Connect WebSocket Server...');
console.log('==================================================');

// Start server function
async function startServer() {
  try {
    console.log('Starting WebSocket server...');
    
    // Create and start WebSocket server
    const server = new WebSocketServer();
    
    // Start the server
    await server.start();
    
    console.log('Server started successfully!');
    console.log('Start time: ' + new Date().toLocaleString());
    console.log('');
    console.log('Server features:');
    console.log('   - Device discovery service');
    console.log('   - File transfer service');
    console.log('   - Screen mirroring service');
    console.log('   - Remote control service');
    console.log('   - Notification sync service');
    console.log('   - Clipboard sync service');
    console.log('');
    console.log('Waiting for client connections...');
    console.log('Press Ctrl+C to stop the server...');
    
    // Handle exit signals
    process.on('SIGINT', async () => {
      console.log('\nStopping server...');
      await server.stop();
      console.log('Server stopped');
      process.exit(0);
    });
    
    process.on('SIGTERM', async () => {
      console.log('\nStopping server...');
      await server.stop();
      console.log('Server stopped');
      process.exit(0);
    });
    
  } catch (error) {
    console.error('Server failed to start:', error);
    process.exit(1);
  }
}

// Start the server
startServer();
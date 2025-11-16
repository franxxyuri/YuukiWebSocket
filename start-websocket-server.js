const WebSocketServer = require('./websocket-server.js');

console.log('Starting Windows-Android Connect WebSocket Server on port 8828...');
console.log('==================================================');

// Start server function
async function startServer() {
  try {
    console.log('Starting WebSocket server on port 8828...');
    
    // Create and start WebSocket server
    const server = new WebSocketServer(8828);
    await server.start();
    
    console.log('Server started successfully!');
    console.log('Server listening on port: 8828');
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
    
    // Keep the server running indefinitely
    // Handle exit signals
    process.on('SIGINT', () => {
      console.log('\nStopping server...');
      server.stop();
      console.log('Server stopped');
      process.exit(0);
    });
    
    process.on('SIGTERM', () => {
      console.log('\nStopping server...');
      server.stop();
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
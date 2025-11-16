console.log('Debug: Starting Windows-Android Connect Server...');
console.log('Debug: ==================================================');

// Import modules
console.log('Debug: Importing modules...');
const NetworkCommunication = require('./network-communication.js');
console.log('Debug: Modules imported successfully');

// Create network communication instance
console.log('Debug: Creating NetworkCommunication instance...');
const networkCommunication = new NetworkCommunication();
console.log('Debug: NetworkCommunication instance created');

// Start server function
async function startServer() {
  try {
    console.log('Debug: About to start server on port 8826...');
    
    // Start network communication server
    console.log('Debug: Calling networkCommunication.startServer(8826)...');
    const result = await networkCommunication.startServer(8826);
    console.log('Debug: networkCommunication.startServer returned:', result);
    
    console.log('Debug: Starting heartbeat check...');
    networkCommunication.startHeartbeatCheck();
    console.log('Debug: Heartbeat check started');
    
    console.log('Debug: Server started successfully!');
    console.log('Debug: Server listening on port: 8826');
    console.log('Debug: Start time: ' + new Date().toLocaleString());
    
    // Keep the server running indefinitely
    console.log('Debug: Setting up exit handlers...');
    
    // Handle exit signals
    process.on('SIGINT', () => {
      console.log('Debug: SIGINT received, stopping server...');
      networkCommunication.destroy();
      console.log('Debug: Server stopped');
      process.exit(0);
    });
    
    process.on('SIGTERM', () => {
      console.log('Debug: SIGTERM received, stopping server...');
      networkCommunication.destroy();
      console.log('Debug: Server stopped');
      process.exit(0);
    });
    
    console.log('Debug: Server is now running and waiting for connections...');
    
  } catch (error) {
    console.error('Debug: Server failed to start:', error);
    console.error('Debug: Error stack:', error.stack);
    process.exit(1);
  }
}

// Start the server
console.log('Debug: About to call startServer()');
startServer().then(() => {
  console.log('Debug: startServer() promise resolved');
}).catch((error) => {
  console.error('Debug: startServer() promise rejected:', error);
});
console.log('Debug: startServer() called');
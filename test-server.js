const NetworkCommunication = require('./network-communication.js');

console.log('Testing network communication module...');

// Create network communication instance
const networkCommunication = new NetworkCommunication();

// Start server function
async function testServer() {
  try {
    console.log('Starting server on port 8826...');
    
    // Start network communication server
    await networkCommunication.startServer(8826);
    networkCommunication.startHeartbeatCheck();
    
    console.log('Server started successfully!');
    console.log('Server is listening on port 8826');
    
    // Keep the server running for 10 seconds
    setTimeout(() => {
      console.log('Stopping server...');
      networkCommunication.destroy();
      console.log('Server stopped');
      process.exit(0);
    }, 10000);
    
  } catch (error) {
    console.error('Server failed to start:', error);
    process.exit(1);
  }
}

// Run the test
testServer();
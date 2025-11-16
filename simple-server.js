const http = require('http');

console.log('Debug: Creating simple HTTP server on port 8827...');

const server = http.createServer((req, res) => {
  console.log('Debug: HTTP request received:', req.method, req.url);
  res.writeHead(200, {'Content-Type': 'text/plain'});
  res.end('Hello from test HTTP server!\n');
});

server.on('error', (err) => {
  console.error('Debug: HTTP Server error:', err);
  console.error('Debug: Error code:', err.code);
});

server.listen(8827, '0.0.0.0', () => {
  console.log('Debug: HTTP Server listening on port 8827');
  console.log('Debug: Server ready to accept connections');
  console.log('Debug: You can test it by opening http://localhost:8827 in a browser');
});

console.log('Debug: HTTP Server setup complete, waiting for connections...');
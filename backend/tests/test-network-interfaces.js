console.log('Testing network interface detection...');

const os = require('os');
const networkInterfaces = os.networkInterfaces();

console.log('Network interfaces:');
console.log(networkInterfaces);

console.log('\nFinding local IP:');
for (const [name, nets] of Object.entries(networkInterfaces)) {
  console.log(`Interface: ${name}`);
  for (const net of nets) {
    console.log(`  Family: ${net.family}, Address: ${net.address}, Internal: ${net.internal}`);
    if (net.family === 'IPv4' && !net.internal) {
      console.log(`  Found external IP: ${net.address}`);
    }
  }
}

console.log('\nTest completed');
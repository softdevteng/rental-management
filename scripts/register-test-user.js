const http = require('http');
const data = JSON.stringify({ email: 'rms-test-user@example.com', password: 'Password123!', role: 'tenant', name: 'RMS Test', idNumber: '00000' });
const options = { hostname: '127.0.0.1', port: 5000, path: '/api/auth/register', method: 'POST', headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) } };
const req = http.request(options, (res) => {
  let body = '';
  res.on('data', d => body += d);
  res.on('end', () => { console.log('STATUS', res.statusCode); console.log('BODY', body); });
});
req.on('error', (e) => { console.error('ERR', e.message); });
req.write(data);
req.end();

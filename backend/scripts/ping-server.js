const http = require('http');
const opts = { hostname: 'localhost', port: process.env.PORT || 5000, path: '/api/health', method: 'GET' };
const req = http.request(opts, res => {
  let data = '';
  res.on('data', d => data += d);
  res.on('end', () => { console.log('status', res.statusCode, 'body', data); process.exit(0); });
});
req.on('error', (e) => { console.error('request error', e && e.message); process.exit(2); });
req.end();

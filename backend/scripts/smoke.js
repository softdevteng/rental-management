// Simple backend smoke test: register, login, fetch tenant profile
const http = require('http');

function request(method, path, body, token) {
  return new Promise((resolve, reject) => {
    const data = body ? Buffer.from(JSON.stringify(body)) : null;
    const options = {
      hostname: 'localhost',
      port: process.env.PORT || 5000,
      path,
      method,
      headers: { 'Content-Type': 'application/json' }
    };
    if (token) options.headers['Authorization'] = `Bearer ${token}`;
    if (data) options.headers['Content-Length'] = data.length;
    const req = http.request(options, (res) => {
      let chunks = '';
      res.on('data', (d) => (chunks += d));
      res.on('end', () => {
        try {
          const json = chunks ? JSON.parse(chunks) : {};
          if (res.statusCode >= 400) return reject(new Error(JSON.stringify(json)));
          resolve(json);
        } catch (e) {
          reject(e);
        }
      });
    });
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

(async () => {
  try {
    const email = 'testuser@example.com';
    const password = 'Passw0rd!';
    // try register, ignore if already exists
    try {
      const reg = await request('POST', '/api/auth/register', { email, password, role: 'tenant' });
      console.log('Register OK');
    } catch (e) {
      console.log('Register skipped:', e.message);
    }
    const login = await request('POST', '/api/auth/login', { email, password });
    console.log('Login OK');
    const token = login.token;
    const me = await request('GET', '/api/tenants/me', null, token);
    console.log('Profile OK:', me && me.email ? me.email : 'no-email');
    console.log('SMOKE PASS');
    process.exit(0);
  } catch (e) {
    console.error('SMOKE FAIL:', e.message);
    process.exit(1);
  }
})();

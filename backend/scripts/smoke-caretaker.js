// Caretaker smoke: register caretaker, login, fetch caretaker profile
const http = require('http');

function request(method, path, body, token) {
  return new Promise((resolve, reject) => {
    const data = body ? Buffer.from(JSON.stringify(body)) : null;
    const options = { hostname: 'localhost', port: process.env.PORT || 5000, path, method, headers: { 'Content-Type': 'application/json' } };
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
        } catch (e) { reject(e); }
      });
    });
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

(async () => {
  try {
    const landlordEmail = 'landlord@example.com';
    const landlordPass = 'Passw0rd!';
    // Ensure landlord account exists
    try { await request('POST', '/api/auth/register', { email: landlordEmail, password: landlordPass, role: 'landlord' }); } catch {}
    const landlordLogin = await request('POST', '/api/auth/login', { email: landlordEmail, password: landlordPass });
    // Seed estate/apartment
  const seed = await request('POST', '/api/dev/seed-basic', {}, landlordLogin.token);
  const apartmentId = seed?.apartment?.id || seed?.apartment?.dataValues?.id || 1;
  console.log('Using apartmentId:', apartmentId);

    // Register caretaker for that apartment
  const ctEmail = `caretaker+${Date.now()}@example.com`;
    const ctPass = 'Passw0rd!';
    try {
      const reg = await request('POST', '/api/auth/register', { email: ctEmail, password: ctPass, role: 'caretaker', fullName: 'CT One', idNumber: '12345678', apartmentId });
      console.log('Caretaker registered');
    } catch (e) {
      console.error('Caretaker register error:', e.message);
    }
    const ctLogin = await request('POST', '/api/auth/login', { email: ctEmail, password: ctPass });
    const me = await request('GET', '/api/landlords/caretakers/me', null, ctLogin.token);
    console.log('Caretaker OK:', me && me.name ? me.name : 'no-name');
    console.log('SMOKE CARETAKER PASS');
    process.exit(0);
  } catch (e) {
    console.error('SMOKE CARETAKER FAIL:', e.message);
    process.exit(1);
  }
})();

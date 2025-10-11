// E2E demo: landlord, tenant, estate/apartment, caretaker, rent reminder, tickets lifecycle
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
    const now = Date.now();
    const landlord = { email: `landlord+${now}@example.com`, password: 'Passw0rd!' };
    const tenant = { email: `tenant+${now}@example.com`, password: 'Passw0rd!' };
    const caretaker = { email: `caretaker+${now}@example.com`, password: 'Passw0rd!' };

    // Register roles
    try { await request('POST', '/api/auth/register', { ...landlord, role: 'landlord' }); } catch {}
    try { await request('POST', '/api/auth/register', { ...tenant, role: 'tenant' }); } catch {}

  // Login
  const ll = await request('POST', '/api/auth/login', landlord);
  const tt = await request('POST', '/api/auth/login', tenant);

    // Create estate and apartment
  console.log('Creating estate...');
  const est = await request('POST', '/api/landlords/estates', { name: `Demo Estate ${now}`, address: '123 Demo St' }, ll.token);
  const apt = await request('POST', `/api/landlords/estates/${est.id}/apartments`, { number: `A-${now % 1000}`, rent: 1500, deposit: 2000 }, ll.token);
  const apartmentId = apt.id;

    // Assign tenant to the new apartment
    const tme = await request('GET', '/api/tenants/me', null, tt.token).catch(()=>null);
    if (tme && tme.id) {
      await request('POST', `/api/landlords/apartments/${apartmentId}/assign-tenant`, { tenantId: tme.id }, ll.token);
    } else {
      console.log('Tenant profile not available, continuing without apartment assignment');
    }

    // Register caretaker assigned to this apartment
    await request('POST', '/api/auth/register', { ...caretaker, role: 'caretaker', fullName: 'Demo Caretaker', idNumber: '12345678', apartmentId: apartmentId });
    const cc = await request('POST', '/api/auth/login', caretaker);

    // Landlord posts rent reminder for the estate
  console.log('Posting rent reminder...');
  await request('POST', '/api/payments/reminders/estate', { estateId: est.id, title: 'Rent Reminder', message: 'Your rent is due.' }, ll.token);

    // Tenant creates two tickets
  console.log('Creating tickets...');
  const t1 = await request('POST', '/api/tenants/tickets', { description: 'Leaky tap' }, tt.token);
  const t2 = await request('POST', '/api/tenants/tickets', { description: 'Broken light' }, tt.token);

    // Caretaker resolves one ticket, landlord resolves the other
    const tInProgress = await request('PUT', `/api/landlords/tickets/${t1.id}/status`, { status: 'in-progress' }, cc.token);
    const tClosed = await request('PUT', `/api/landlords/tickets/${t2.id}/status`, { status: 'closed' }, ll.token);

    // Tenant fetches notices to verify reminder appears
  const me = await request('GET', '/api/tenants/me', null, tt.token);
  const estateId = me?.Apartment?.Estate?.id || est.id;
  const notices = await request('GET', `/api/notices/estate/${estateId}`, null, tt.token);

    console.log('DEMO OK:', {
      estate: est.name,
      apartmentId,
      caretaker: 'Demo Caretaker',
      tickets: { created: [t1.id, t2.id], statuses: [tInProgress.status, tClosed.status] },
      notices: notices.length,
    });
    process.exit(0);
  } catch (e) {
    console.error('DEMO FAIL:', e.message);
    process.exit(1);
  }
})();

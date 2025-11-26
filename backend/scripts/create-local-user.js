(async ()=>{
  try {
    const db = require('../db');
    await db.connectAndSync();
    const bcrypt = require('bcryptjs');
    const jwt = require('jsonwebtoken');
    const email = 'rms-test-user@example.com';
    const password = 'Password123!';
    const name = 'RMS Test';
    const idNumber = '00000';
    // Create or find tenant
    let tenant = await db.models.Tenant.findOne({ where: { email } });
    if (!tenant) tenant = await db.models.Tenant.create({ name, idNumber, email });
    // Create or find user
    let user = await db.models.User.findOne({ where: { email } });
    if (!user) {
      const hashed = await bcrypt.hash(password, 10);
      user = await db.models.User.create({ email, password: hashed, role: 'tenant', refId: tenant.id });
    }
    const token = jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET || 'secretkey', { expiresIn: '1d' });
    console.log('CREATED TOKEN:', token);
  } catch (e) { console.error('ERR', e && e.stack || e); process.exit(1); }
  process.exit(0);
})();

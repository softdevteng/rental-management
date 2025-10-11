// Entry point for Express backend
require('dotenv').config();
const express = require('express');
const path = require('path');
const { connectAndSync, dbHealth } = require('./db');
const app = express();
app.use(express.json());
// serve uploaded files statically
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Health endpoint (reports DB status)
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', dbState: dbHealth() });
});

app.get('/', (req, res) => {
  res.send('Rental Management System Backend');
});

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/tenants', require('./routes/tenants'));
app.use('/api/landlords', require('./routes/landlords'));
app.use('/api/payments', require('./routes/payments'));
app.use('/api/tickets', require('./routes/tickets'));
app.use('/api/notices', require('./routes/notices'));
app.use('/api/uploads', require('./routes/uploads'));
app.use('/api/public', require('./routes/public'));
if (process.env.ENABLE_DEV_ROUTES === 'true') {
  app.use('/api/dev', require('./routes/dev'));
}

const PORT = process.env.PORT || 5000;

// Only start server once DB is connected
async function start() {
  try {
    await connectAndSync();
    console.log('MySQL connected and synced');
    app.listen(PORT, () => {
      console.log(`Backend running on port ${PORT}`);
    });
  } catch (err) {
    console.error('Failed to connect to MySQL:', err.message);
    process.exit(1);
  }
}

start();

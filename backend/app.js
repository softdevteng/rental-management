require('dotenv').config();
const express = require('express');
const path = require('path');
const { dbHealth } = require('./db');

function createApp() {
  const app = express();
  app.use(express.json());
  // serve uploaded files statically (note: ephemeral on serverless platforms like Vercel)
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
  return app;
}

module.exports = { createApp };

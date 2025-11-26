require('dotenv').config();
const express = require('express');
const path = require('path');
const { dbHealth } = require('./db');

function createApp() {
  const app = express();
  // capture raw body for routes that need signature verification (e.g., MPESA callbacks)
  app.use(express.json({ verify: (req, res, buf) => { try { req.rawBody = buf; } catch (e) { req.rawBody = null; } } }));
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
  app.use('/api/expenses', require('./routes/expenses'));
  app.use('/api/payments', require('./routes/payments'));
  app.use('/api/reports', require('./routes/reports'));
  app.use('/api/tickets', require('./routes/tickets'));
  app.use('/api/notices', require('./routes/notices'));
  app.use('/api/uploads', require('./routes/uploads'));
  app.use('/api/public', require('./routes/public'));
  app.use('/api/admin', require('./routes/admin'));
  if (process.env.ENABLE_DEV_ROUTES === 'true') {
    app.use('/api/dev', require('./routes/dev'));
  }
  return app;
}

// Create an HTTP server from the express app and (optionally) initialize Socket.IO.
// Attaches the Socket.IO server to the stream utility so broadcasts use sockets when available.
function createServer(app) {
  const http = require('http');
  const server = http.createServer(app);
  let io = null;
  try {
    // Lazy-require socket.io so the project can run without it if not installed
    const { Server } = require('socket.io');
    io = new Server(server, {
      cors: {
        origin: process.env.SOCKET_IO_ORIGINS || '*',
        methods: ['GET', 'POST']
      }
    });
    // Socket.IO authentication: verify JWT and attach user info to socket.data.user
    try {
      const jwt = require('jsonwebtoken');
      const secret = process.env.JWT_SECRET || 'secretkey';
      const { models } = require('./db');
      io.use(async (socket, next) => {
        try {
          const token = socket.handshake.auth && socket.handshake.auth.token ? socket.handshake.auth.token : (socket.handshake.query && socket.handshake.query.token);
          if (!token) return next(new Error('Authentication error: no token'));
          const decoded = jwt.verify(token, secret);
          if (!decoded || !decoded.id) return next(new Error('Authentication error: invalid token'));
          // Lookup user in DB to attach authoritative role/refId
          try {
            const user = await models.User.findByPk(decoded.id);
            if (!user) return next(new Error('Authentication error: user not found'));
            socket.data.user = { id: user.id, role: (user.role||'').toString().toLowerCase(), refId: user.refId };
            return next();
          } catch (dbErr) {
            return next(new Error('Authentication error'));
          }
        } catch (err) {
          return next(new Error('Authentication error'));
        }
      });
    } catch (e) {
      console.warn('Socket.IO auth setup failed', e && e.message);
    }
    // Attach io to stream util so publish() will also emit via sockets
    try {
      const { attachSocketIo } = require('./utils/stream');
      attachSocketIo(io);
      app.locals.io = io;
      console.log('Socket.IO initialized and attached to stream util');
    } catch (e) {
      console.warn('Failed to attach Socket.IO to stream util:', e && e.message);
    }
  } catch (e) {
    console.info('Socket.IO not configured or not installed - continuing without realtime sockets');
  }

  return { server, io };
}

module.exports = { createApp, createServer };

// Entry for local dev server
require('dotenv').config();
const { connectAndSync } = require('./db');
const { createApp, createServer } = require('./app');

const app = createApp();
const PORT = process.env.PORT || 5000;

async function start() {
  try {
    await connectAndSync();
    console.log('MySQL connected and synced');
  } catch (err) {
    console.error('Failed to connect to MySQL:', err && err.message ? err.message : err);
    console.warn('Starting server in degraded mode (DB unavailable). Some features will be limited.');
  }

  const { server, io } = createServer(app);
  server.listen(PORT, () => console.log(`Backend running on port ${PORT}`));

  if (io) {
    // basic connection logging
    io.on('connection', (socket) => {
      console.log('Socket.IO client connected', socket.id);
      socket.on('disconnect', () => console.log('Socket.IO client disconnected', socket.id));
    });
  }
}
start();

// Global handlers to keep the server alive during development and surface errors
process.on('unhandledRejection', (reason, p) => {
  console.error('Unhandled Rejection at:', p, 'reason:', reason);
});
process.on('uncaughtException', (err) => {
  console.error('Uncaught exception:', err && err.stack ? err.stack : err);
});

// Entry for local dev server
require('dotenv').config();
const { connectAndSync } = require('./db');
const { createApp } = require('./app');

const app = createApp();
const PORT = process.env.PORT || 5000;

async function start() {
  try {
    await connectAndSync();
    console.log('MySQL connected and synced');
    app.listen(PORT, () => console.log(`Backend running on port ${PORT}`));
  } catch (err) {
    console.error('Failed to connect to MySQL:', err.message);
    process.exit(1);
  }
}

start();

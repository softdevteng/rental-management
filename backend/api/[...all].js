const { createApp } = require('../app');
const { connectAndSync } = require('../db');

let serverPromise;

async function ensureReady() {
  if (!serverPromise) {
    serverPromise = connectAndSync().then(() => createApp());
  }
  return serverPromise;
}

module.exports = async (req, res) => {
  try {
    const app = await ensureReady();
    return app(req, res);
  } catch (err) {
    res.statusCode = 500;
    res.end(`Server error: ${err.message}`);
  }
};

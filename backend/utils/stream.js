// Stream utility supporting SSE, Socket.IO and optional Redis pub/sub
const clients = new Set();
let ioServer = null;

// Optional Redis pub/sub
let redisPub = null;
let redisSub = null;
const REDIS_URL = process.env.REDIS_URL || process.env.REDIS;
if (REDIS_URL) {
  try {
    const IORedis = require('ioredis');
    redisPub = new IORedis(REDIS_URL);
    redisSub = new IORedis(REDIS_URL);
    redisSub.on('message', (ch, msg) => {
      try { const parsed = JSON.parse(msg); _broadcast(ch, parsed); } catch (e) {}
    });
  } catch (e) {
    console.warn('Redis not available for stream pub/sub', e && e.message);
  }
}

function initSSE(req, res) {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
  });
  res.write('\n');
  const client = res;
  clients.add(client);
  req.on('close', () => {
    clients.delete(client);
  });
}

function _broadcast(event, data) {
  const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  // SSE clients
  for (const c of clients) {
    try { c.write(payload); } catch (e) {}
  }
  // Socket.IO
  try { if (ioServer) ioServer.emit(event, data); } catch (e) {}
}

async function publish(channelOrEvent, data) {
  // If Redis pub is configured, publish to channel
  if (redisPub) {
    try { await redisPub.publish(channelOrEvent, JSON.stringify(data)); return; } catch (e) { /* fallthrough */ }
  }
  // otherwise broadcast locally
  _broadcast(channelOrEvent, data);
}

function attachSocketIo(io) { ioServer = io; }

module.exports = { initSSE, publish, attachSocketIo };

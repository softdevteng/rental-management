const ioClient = require('socket.io-client');
const { createApp, createServer } = require('../app');
const { connectAndSync, models, sequelize } = require('../db');

jest.setTimeout(20000);

describe('Socket.IO auth', () => {
  let server; let app; let httpServer; let baseUrl;
  beforeAll(async () => {
    process.env.NODE_ENV = 'test';
    process.env.USE_SQLITE_IN_MEMORY = 'true';
    await connectAndSync();
    app = createApp();
    const created = createServer(app);
    httpServer = created.server;
    server = httpServer.listen(0);
    const port = server.address().port;
    baseUrl = `http://localhost:${port}`;
  });
  afterAll(async () => {
    try { await server.close(); } catch {};
    try { await sequelize.close(); } catch {};
  });

  test('connection without token should fail', (done) => {
    const socket = ioClient(baseUrl, { transports: ['polling','websocket'], reconnection: false });
    socket.on('connect_error', (err) => {
      expect(err).toBeDefined();
      socket.close();
      done();
    });
    // safety timeout
    setTimeout(() => { try { socket.close(); } catch {} ; done(new Error('connect did not error fast enough')); }, 10000);
  });

  test('connection with valid token should succeed', (done) => {
    const User = models.User;
    User.create({ email: 's@t.com', password: 'x', role: 'tenant' }).then((u) => {
      u.refId = 123; return u.save();
    }).then((u) => {
      const jwt = require('jsonwebtoken');
      const token = jwt.sign({ id: u.id }, process.env.JWT_SECRET || 'secretkey');
  const socket = ioClient(baseUrl, { transports: ['polling','websocket'], auth: { token }, reconnection: false });
      socket.on('connect', () => {
        try {
          expect(socket.connected).toBeTruthy();
          socket.close();
          done();
        } catch (err) { socket.close(); done(err); }
      });
      socket.on('connect_error', (err) => { socket.close(); done(err || new Error('connect_error')); });
  setTimeout(() => { try { socket.close(); } catch {} ; done(new Error('connect did not occur quickly')); }, 10000);
    }).catch(done);
  });
});

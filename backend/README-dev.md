Development startup

Use the in-memory SQLite dev mode for quick local runs (no MySQL required):

```powershell
# from repository root
cd backend
npm install
npm run dev
```

This sets USE_SQLITE_IN_MEMORY=true so the server starts using an in-memory SQLite DB. Tests already use this mode when NODE_ENV=test or when USE_SQLITE_IN_MEMORY=true.

Notes
- `npm start` will attempt to connect to MySQL using env vars; if the DB is unavailable, the server will start in degraded mode but some features will be limited.
- To run tests:

```powershell
cd backend
npm test
```

Migration (Expense table)

If you're running against a MySQL database (CI or production), create the Expense table before running the app or tests against MySQL by running:

```powershell
cd backend
npm run migrate
```

The migration script is idempotent and will skip creation if the table already exists. The project currently uses `sequelize.sync({ alter: true })` in development/testing, but this script is handy when running tests against an external MySQL instance or for initial manual provisioning.

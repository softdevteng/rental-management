# Rental Management System

A full-stack application for managing rental properties, tenants, and landlords. Features include:

- Tenant and landlord dashboards
- Secure sign-in/authentication
- Tenant payment history view
- Repair ticket submission by tenants
- Tenant vacate notice (one month in advance for deposit refund)
- Landlord management of rent payments for multiple estates/apartments
- Notice board for landlord-to-tenant communication
- Landlord management of repair tickets

## Tech Stack
- Frontend: React 18 + react-router-dom v6
- Backend: Node.js/Express
- Database: MySQL (via Sequelize)

## Getting Started
1. Install dependencies: `npm install` in both frontend and backend folders
2. Start backend server (port 5000 by default):
	 - Option A (from backend folder):
		 - `npm start`
		 - If you see "Missing script: start", run `node index.js`
	 - Option B (from workspace root):
		 - `npm run start:backend`
3. Start frontend:
	 - From `frontend` folder: `npm start`
	 - Or from root: `npm run start:frontend`

### Ports
- Backend: http://localhost:5000 (default). Change with `PORT` env var before the command, e.g. on PowerShell:
	- `$env:PORT=5500; npm start` (in backend folder)
- Frontend dev server: typically http://localhost:3000
- 127.0.0.1:5500 is commonly a static/live server and is not your API unless you set `PORT=5500`.

## Folder Structure
- `/backend` - Node.js/Express API
- `/frontend` - React app
- `/docs` - Documentation and API specs
- `.github/copilot-instructions.md` - Copilot workflow instructions

## MySQL Setup
The backend uses MySQL via Sequelize.

1) Copy the env template and set variables:

```
Copy-Item .\backend\.env.example .\backend\.env -Force
```

Edit `backend/.env` and set:
- MYSQL_HOST, MYSQL_PORT, MYSQL_DB, MYSQL_USER, MYSQL_PASSWORD
- JWT_SECRET and FRONTEND_URL

2) Ensure MySQL server is running and the `rms` database exists (or grant permissions for Sequelize to create it).

3) Install backend dependencies and start:

```
npm install --prefix .\backend
npm start --prefix .\backend
```

4) Health check:
- `GET http://localhost:5000/api/health` returns `{ dbState: 1 }` when connected and synced.

### Purging dev sample data
If you previously used the dev seeding route or want to remove any sample estates (named like "Sample Estate <timestamp>") and related data:

1) In `backend/.env`, set:

```
ALLOW_PURGE=true
```

2) Run the purge script from the backend folder:

```
npm run purge:samples
```

This safely deletes:
- Estates whose name starts with "Sample Estate"
- Their apartments, notices, tickets, payments, and caretakers
- Any caretaker with name "Sample Caretaker" or email like `caretaker+...@example.com`

Note: Real data will not be touched unless it matches the sample patterns above.

## Continuous Integration (CI)
This repo includes a GitHub Actions workflow at `.github/workflows/ci.yml` that:
- Checks out code, sets up Node 20
- Installs backend and frontend dependencies
- Builds the frontend

CI runs on pushes and PRs to `main`.

## Deploy to Render
This repo includes a `render.yaml` with two services:
- Node Web Service for the backend (rootDir: `backend`, start: `node index.js`)
- Static Site for the frontend (rootDir: `frontend`, publish: `build`)

Steps:
1) Create a new Render Blueprint from this repo (Render Dashboard → New + → Blueprint).
2) Set the environment variables on the backend service:
	- PORT (Render sets this; the file defaults to 10000 but Render overrides automatically)
	- MYSQL_HOST, MYSQL_PORT, MYSQL_DB, MYSQL_USER, MYSQL_PASSWORD
	- JWT_SECRET, FRONTEND_URL
3) For the frontend static site, set `REACT_APP_API_BASE` if your API is hosted at a different domain.
4) Deploy. On successful deploy, update `FRONTEND_URL` in the backend to match the frontend domain for password reset links.

## Next Steps
- Implement authentication
- Build dashboards for tenant and landlord
- Add payment, ticket, and notice features

---
Feel free to request additional features or adjustments as we build out the system.
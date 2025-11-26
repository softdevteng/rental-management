# Safe purge of sample data

This document describes a safe, manual procedure for purging sample/demo data created by dev scripts. Do not run the steps below without verifying environment variables and backups.

Prerequisites
- You have a working backup of your production data (if applicable).
- You are operating in a non-production environment (dev, staging) unless you fully understand the implications.
- `ALLOW_PURGE=true` is set in `backend/.env` to enable purge scripts.

Steps
1) Confirm environmen/. 0201 GHYU87*+-.

```powershell
# from repository root
Get-Content backend\.env
# ensure you see ALLOW_PURGE=true and DB connection points are NOT pointing at prod
```

2) Run the purge script (safe mode)

```powershell
# Run using npm script that is present in backend package.json
npm run purge:samples --prefix .\backend
```

3) Verify results
- Check that estates named like `Sample Estate` are removed:

```powershell
# list estates via a simple API (if running) or query DB directly
# Quick API check (backend must be running):
Invoke-RestMethod -Uri http://localhost:5000/api/landlords/me -Headers @{ Authorization = "Bearer <token>" }
```

4) If something unexpected was removed, restore from backup.

Safety tips
- Never set `ALLOW_PURGE=true` in production.
- If you must run in a shared environment, take a DB snapshot first.
- Review `backend/scripts/purge-sample.js` before executing to ensure the patterns match only sample data.

If you want, I can add an automated GitHub Action that requires a manual approval step before running purge on a staging environment.

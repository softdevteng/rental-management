# Deployment and Purge Guide

This document explains how to deploy to Vercel and how to remove demo/sample data from the production database.

## Vercel deployment (GitHub)
We provided a GitHub Actions workflow `.github/workflows/vercel-deploy.yml` that builds the frontend and deploys to Vercel on push to `main` or on manual dispatch.

Required repository secrets (set these in your GitHub repo Settings → Secrets):
- `VERCEL_TOKEN` — your Vercel personal token
- `VERCEL_ORG_ID` — your Vercel organization id
- `VERCEL_PROJECT_ID` — the Vercel project id for this repository

When these are present, pushing to `main` will trigger the workflow which builds the frontend and runs the Vercel deploy action.

If you prefer to deploy locally, you can run:

```powershell
cd frontend
npx vercel --prod
```

(You will be prompted to log in to Vercel if needed.)

## Purging demo/sample data (manual, safe)
A manual workflow `.github/workflows/purge-samples.yml` was added. It runs `backend/scripts/purge-sample.js` — this script deletes obvious demo data created by the dev seeding route.

To use it safely:
1. Create the following repository secrets in GitHub (Settings → Secrets):
   - `MYSQL_HOST`, `MYSQL_PORT`, `MYSQL_DB`, `MYSQL_USER`, `MYSQL_PASSWORD`
   - `JWT_SECRET`
2. Go to the Actions tab, find `Purge Demo Data (manual)` and click **Run workflow** to execute it. The job will set `ALLOW_PURGE=true` when running.

Alternatively you can run it locally (recommended to test first against a copy):

```powershell
cd backend
# ensure backend/.env has production DB settings or export the env vars
$env:ALLOW_PURGE='true'; $env:MYSQL_HOST='...'; $env:MYSQL_PORT='3306'; $env:MYSQL_DB='...'; $env:MYSQL_USER='...'; $env:MYSQL_PASSWORD='...'; node scripts/purge-sample.js
```

**Important:** The purge script removes rows that match likely sample/demo patterns (names starting with `Sample Estate`, `Sample Caretaker`, `Welcome Notice`, etc.). Review the script before running on production.

## Notes & Troubleshooting
- The Vercel deploy workflow builds the frontend before calling the Vercel action. If the build fails locally, fix the errors (missing env variables or packages) and repeat.
- If Vercel reports build-time environment variable errors, add those env vars in the Vercel project settings.

If you want, I can:
- Try to re-run a build here and inspect logs, or
- Connect the repo with Vercel (requires Vercel token and project IDs), or
- Run the purge workflow once you provide the required secrets.

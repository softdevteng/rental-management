# Changelog

All notable changes to this project are recorded in this file.

## [Unreleased] - 2025-11-04

- Add tenant deletion tests (frontend + backend) and a concurrency test for tenant-code generation.
- Frontend: improved Add Tenant form accessibility (labels associated with inputs) and added RTL tests covering server-generated tenant codes.
- Backend: allow forcing MySQL in CI via `FORCE_MYSQL=true` so concurrency tests run against a real RDBMS in CI.
- CI: add GitHub Actions workflow to run `test:all` against a MySQL service (see `.github/workflows/ci.yml`).
- Remove Render/Vercel manifests in favor of explicit CI testing and documented deployment steps.

# Automated workflows and background jobs (design)

This doc outlines a recommended approach to background jobs for scheduled tasks (rent reminders, automatic billing, maintenance assignment) and implementation options.

Options
- Node-cron (no external dependencies)
  - Pros: simple, no external services
  - Cons: not reliable across multiple server instances; fails if process restarts

- Redis-backed queue (BullMQ or Bull)
  - Pros: robust, supports retries, delayed jobs, concurrency control
  - Cons: requires Redis service

- Agenda (Mongo-backed scheduler)
  - Pros: persistent scheduling with MongoDB
  - Cons: requires MongoDB; project already uses SQL

Recommendation
- For production-grade scheduling, use BullMQ (Redis) for job queues and a small worker process. For lightweight deployments, a single-process node-cron + persistent DB flagging can be acceptable.

Example job types
- rent:reminder — send reminder emails/SMS for upcoming due rent (daily cron) via emails or MPesa prompt
- payment:reconcile — reconcile pending payments (poll MPesa callbacks or status) and mark as paid
- maintenance:assign — automatically assign new tickets to caretakers based on load (scheduled or on-demand)

Minimal worker scaffold (pseudo)
1. Create `backend/worker/index.js` that connects to Redis and listens for jobs.
2. Create `backend/jobs/*.js` with job handlers (send reminder, reconcile payments).
3. Push jobs from API code using `queue.add('rent:reminder', { estateId })`.

Operational notes
- Run the worker as a separate service (Docker container). Configure concurrency via environment variables.
- Add health checks and job metrics (Prometheus) if needed.

# Analytics & reporting — proposal

This document describes a minimal analytics/reporting roadmap and sample aggregation queries for occupancy, revenue, and turnover.

Key metrics
- Occupancy rate (per estate / across estates)
- Monthly recurring revenue (collected vs pending)
- Turnover rate (tenants moved out per period)
- Average time-to-vacate / time-to-repair

Suggested endpoints
- GET /api/reports/summary — already present; use for dashboard widgets
- GET /api/reports/monthly-revenue?year=YYYY — returns timeseries of collected/pending per month
- GET /api/reports/turnover?from=YYYY-MM-DD&to=YYYY-MM-DD

Example SQL (Sequelize Query pseudocode)
-- monthly collected
SELECT strftime('%Y-%m', date) as month, SUM(CASE WHEN status='paid' THEN amount ELSE 0 END) as collected, SUM(CASE WHEN status!='paid' THEN amount ELSE 0 END) as pending FROM Payments WHERE date BETWEEN :start AND :end GROUP BY month ORDER BY month;

Data & privacy
- Keep personally-identifiable information (PII) out of aggregated reports or mask it. Only surface aggregated metrics in analytics endpoints unless role-authorized.

Next steps
- Implement endpoints that return JSON-friendly aggregates and create simple frontend widgets under `frontend/src/components/dashboard` that consume them.

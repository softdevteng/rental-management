import React from 'react';
import EstateSummary from './EstateSummary';
import AnalyticsSummary from './AnalyticsSummary';
import KPIsSummary from './KPIsSummary';

export default function DashboardPage() {
  return (
    <div>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:12 }}>
        <div>
          <h2 style={{ margin:0 }}>Estate Dashboard</h2>
          <div className="muted">Overview of KPIs and recent activity</div>
        </div>
        <div>
          {/* Placeholder for future filters: date range, estate selector */}
          <div style={{ display:'flex', gap:8 }}>
            <button className="btn classic" aria-label="Last 30 days">Last 30d</button>
            <button className="btn classic" aria-label="Last 90 days">Last 90d</button>
            <button
              className="btn primary"
              aria-label="Export CSV"
              onClick={async () => {
                try {
                  const [kpis, analytics] = await Promise.all([
                    api('/api/reports/kpis'),
                    api('/api/reports/analytics'),
                  ]);
                  const { exportToCsv, flattenForCsv } = await import('../../lib/exportCsv');
                  const rows = flattenForCsv(kpis, analytics);
                  exportToCsv('estate-kpis.csv', rows);
                } catch (err) {
                  // best-effort: show a simple alert on error
                  // eslint-disable-next-line no-alert
                  alert('Failed to export CSV: ' + (err?.message || err));
                }
              }}
            >Export CSV</button>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 12 }}>
        <div>
          <EstateSummary />
        </div>
        <aside>
          <KPIsSummary />
          <AnalyticsSummary />
        </aside>
      </div>
    </div>
  );
}

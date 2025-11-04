import React, { useEffect, useState } from 'react';
import { api } from '../../lib/api';
import { ResponsiveContainer, LineChart, Line, XAxis, Tooltip, AreaChart, Area } from 'recharts';

export default function KPIsSummary() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await api('/api/reports/kpis');
        if (!mounted) return;
        setData(res);
      } catch (err) {
        if (!mounted) return;
        setError(err.message || 'Failed to load KPIs');
      } finally {
        if (!mounted) return;
        setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  if (loading) return <div className="card">Loading KPIs…</div>;
  if (error) return <div className="card">Error: {error}</div>;
  if (!data) return <div className="card">No data</div>;

  const { turnover = [], occupancyTrend = [], expenseSummary = {} } = data;

  const useResponsive = typeof window !== 'undefined' && typeof window.ResizeObserver !== 'undefined';

  return (
    <div className="card">
      <h3>KPIs</h3>
      <div style={{ display: 'grid', gap: 8 }}>
        <div>
          <div className="muted">Turnover (last months)</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 200, height: 48 }} aria-hidden>
              {useResponsive ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={turnover.map(t => ({ month: t.month, newTenants: Number(t.newTenants || 0), vacated: Number(t.vacated || 0) }))} margin={{ top: 2, right: 6, left: 6, bottom: 2 }}>
                    <XAxis dataKey="month" hide />
                    <Tooltip formatter={(v) => v} />
                    <Line type="monotone" dataKey="newTenants" stroke="#7c3aed" strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="vacated" stroke="#ef4444" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <LineChart width={200} height={48} data={turnover.map(t => ({ month: t.month, newTenants: Number(t.newTenants || 0), vacated: Number(t.vacated || 0) }))} margin={{ top: 2, right: 6, left: 6, bottom: 2 }}>
                  <XAxis dataKey="month" hide />
                  <Tooltip formatter={(v) => v} />
                  <Line type="monotone" dataKey="newTenants" stroke="#7c3aed" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="vacated" stroke="#ef4444" strokeWidth={2} dot={false} />
                </LineChart>
              )}
            </div>
            <ul style={{ margin: 0 }}>
              {turnover.map(t => (
                <li key={t.month}><strong>{t.month}</strong>: new {t.newTenants} · vacated {t.vacated}</li>
              ))}
            </ul>
          </div>
        </div>
        <div>
          <div className="muted">Occupancy trend</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 200, height: 48 }} aria-hidden>
              {useResponsive ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={occupancyTrend.map(o => ({ month: o.month, occupancyPct: Number(o.occupancyPct || 0) }))} margin={{ top: 2, right: 6, left: 6, bottom: 2 }}>
                    <XAxis dataKey="month" hide />
                    <Tooltip formatter={(v) => `${v}%`} />
                    <Area type="monotone" dataKey="occupancyPct" stroke="#06b6d4" fill="#bae6fd" fillOpacity={0.6} />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <AreaChart width={200} height={48} data={occupancyTrend.map(o => ({ month: o.month, occupancyPct: Number(o.occupancyPct || 0) }))} margin={{ top: 2, right: 6, left: 6, bottom: 2 }}>
                  <XAxis dataKey="month" hide />
                  <Tooltip formatter={(v) => `${v}%`} />
                  <Area type="monotone" dataKey="occupancyPct" stroke="#06b6d4" fill="#bae6fd" fillOpacity={0.6} />
                </AreaChart>
              )}
            </div>
            <ul style={{ margin: 0 }}>
              {occupancyTrend.map(o => (
                <li key={o.month}><strong>{o.month}</strong>: {o.occupied}/{o.totalUnits} ({o.occupancyPct}%)</li>
              ))}
            </ul>
          </div>
        </div>
        <div>
          <div className="muted">Revenue summary</div>
          <div>Collected: <strong>KSh {Number(expenseSummary.collected || 0).toLocaleString()}</strong></div>
          <div>Pending: <strong>KSh {Number(expenseSummary.pending || 0).toLocaleString()}</strong></div>
        </div>
      </div>
    </div>
  );
}

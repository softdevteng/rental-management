import React, { useEffect, useState } from 'react';
import { api } from '../../lib/api';
import { ResponsiveContainer, BarChart, Bar, XAxis, Tooltip } from 'recharts';

export default function AnalyticsSummary() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let mounted = true;
    api('/api/reports/analytics').then(d => { if (!mounted) return; setData(d); setLoading(false); }).catch(e => { if (!mounted) return; setError(e.message); setLoading(false); });
    return () => { mounted = false; };
  }, []);

  if (loading) return <div className="card">Loading analytics...</div>;
  if (error) return <div className="card">Error: {error}</div>;

  const useResponsive = typeof window !== 'undefined' && typeof window.ResizeObserver !== 'undefined';

  return (
    <div className="card">
      <h3>Analytics</h3>
      <div>
        <h4>Monthly Revenue</h4>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <div style={{ width: 260, height: 64 }} aria-hidden>
            {useResponsive ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.monthlyRevenue} margin={{ top: 4, right: 6, left: 6, bottom: 4 }}>
                  <XAxis dataKey="month" hide />
                  <Tooltip formatter={(value) => `KSh ${Number(value).toLocaleString()}`} />
                  <Bar dataKey="collected" fill="#10b981" radius={[4,4,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <BarChart width={260} height={64} data={data.monthlyRevenue} margin={{ top: 4, right: 6, left: 6, bottom: 4 }}>
                <XAxis dataKey="month" hide />
                <Tooltip formatter={(value) => `KSh ${Number(value).toLocaleString()}`} />
                <Bar dataKey="collected" fill="#10b981" radius={[4,4,0,0]} />
              </BarChart>
            )}
          </div>
          <ul style={{ margin: 0 }}>
            {data.monthlyRevenue.map(m => <li key={m.month}>{m.month}: KSh {m.collected.toLocaleString()}</li>)}
          </ul>
        </div>
      </div>
      <div style={{ marginTop: 10 }}>
        <h4>New Tenants</h4>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <div style={{ width: 260, height: 64 }} aria-hidden>
            {useResponsive ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.monthlyNewTenants} margin={{ top: 4, right: 6, left: 6, bottom: 4 }}>
                  <XAxis dataKey="month" hide />
                  <Tooltip formatter={(value) => `${value}`} />
                  <Bar dataKey="count" fill="#7c3aed" radius={[4,4,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <BarChart width={260} height={64} data={data.monthlyNewTenants} margin={{ top: 4, right: 6, left: 6, bottom: 4 }}>
                <XAxis dataKey="month" hide />
                <Tooltip formatter={(value) => `${value}`} />
                <Bar dataKey="count" fill="#7c3aed" radius={[4,4,0,0]} />
              </BarChart>
            )}
          </div>
          <ul style={{ margin: 0 }}>
            {data.monthlyNewTenants.map(m => <li key={m.month}>{m.month}: {m.count}</li>)}
          </ul>
        </div>
      </div>
    </div>
  );
}

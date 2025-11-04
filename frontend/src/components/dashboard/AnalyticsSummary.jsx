import React, { useEffect, useState } from 'react';
import { api } from '../../lib/api';

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

  return (
    <div className="card">
      <h3>Analytics</h3>
      <div>
        <h4>Monthly Revenue</h4>
        <ul>
          {data.monthlyRevenue.map(m => <li key={m.month}>{m.month}: KSh {m.collected.toLocaleString()}</li>)}
        </ul>
      </div>
      <div>
        <h4>New Tenants</h4>
        <ul>
          {data.monthlyNewTenants.map(m => <li key={m.month}>{m.month}: {m.count}</li>)}
        </ul>
      </div>
    </div>
  );
}

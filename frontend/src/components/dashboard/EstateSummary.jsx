import React, { useEffect, useState } from 'react';
import { api } from '../../lib/api';

export default function EstateSummary({ initialData = null }) {
  const [data, setData] = useState(initialData);
  const [loading, setLoading] = useState(!initialData);
  const [error, setError] = useState(null);

  useEffect(() => {
    let mounted = true;
    if (!initialData) {
      setLoading(true);
      api('/api/reports/estate-summary').then(d => {
        if (!mounted) return;
        setData(d);
        setLoading(false);
      }).catch(err => {
        if (!mounted) return;
        setError(err.message || 'Failed to load');
        setLoading(false);
      });
    }
    return () => { mounted = false; };
  }, [initialData]);

  const occupancy = data?.occupancy || { total: 0, occupied: 0, vacant: 0 };
  const revenue = data?.revenue || { collected: 0, pending: 0 };

  if (loading) return <div className="card">Loading estate summary...</div>;
  if (error) return <div className="card">Error loading summary: {error}</div>;

  return (
    <div className="card">
      <h3>Estate Summary</h3>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8 }}>
        <div>
          <div className="muted">Units</div>
          <div><strong>{occupancy.total}</strong></div>
        </div>
        <div>
          <div className="muted">Occupied</div>
          <div><strong>{occupancy.occupied}</strong></div>
        </div>
        <div>
          <div className="muted">Vacant</div>
          <div><strong>{occupancy.vacant}</strong></div>
        </div>
      </div>
      <div style={{ marginTop: 12 }}>
        <div className="muted">Tenants</div>
        <div><strong>{data?.tenantsCount ?? 0}</strong></div>
        <div className="muted">Collected</div>
        <div><strong>KSh {Number(revenue.collected||0).toLocaleString()}</strong></div>
        <div className="muted">Pending</div>
        <div><strong>KSh {Number(revenue.pending||0).toLocaleString()}</strong></div>
        <div className="muted">Open tickets</div>
        <div><strong>{data?.tickets?.open ?? 0}</strong></div>
      </div>
    </div>
  );
}

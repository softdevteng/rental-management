import React from 'react';

export default function EstateSummary({ data = { occupancy: { total: 0, occupied: 0, vacant: 0 }, revenue: { collected: 0, pending: 0 } } }) {
  const { occupancy, revenue } = data;
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
        <div className="muted">Collected</div>
        <div><strong>KSh {Number(revenue.collected||0).toLocaleString()}</strong></div>
        <div className="muted">Pending</div>
        <div><strong>KSh {Number(revenue.pending||0).toLocaleString()}</strong></div>
      </div>
    </div>
  );
}

import React from 'react';
import { api } from '../lib/api';

export default function DashboardOverview({ role, token, payments = [], notices = [], tickets = [], kpis = {}, estates = [], onRefresh }) {
  const paidCount = payments.filter(p => p.status === 'paid').length;
  const dueCount = payments.filter(p => p.status !== 'paid').length;
  return (
    <div>
      <div className="kpis">
        <div className="kpi">
          <div className="kpi-label">Payments due</div>
          <div className="kpi-value">{dueCount}</div>
        </div>
        <div className="kpi">
          <div className="kpi-label">Payments paid</div>
          <div className="kpi-value">{paidCount}</div>
        </div>
        <div className="kpi">
          <div className="kpi-label">Open tickets</div>
          <div className="kpi-value">{kpis.open ?? (tickets.filter(t => t.status!=='closed').length)}</div>
        </div>
        <div className="kpi">
          <div className="kpi-label">Properties</div>
          <div className="kpi-value">{estates.length}</div>
        </div>
      </div>

      <div className="overview-grid">
        <div className="overview-left">
          <div className="card big-card header-graph">
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              <div>
                <h3 className="card-title">Overview</h3>
                <div className="muted">Recent activity and trend</div>
              </div>
              <div style={{ textAlign:'right' }}>
                <div style={{ fontSize:18, fontWeight:700 }}>{`KSh ${payments.reduce((s,p)=> s + (Number(p.amount||0)),0).toLocaleString()}`}</div>
                <div className="muted">Collected</div>
              </div>
            </div>
            <svg className="spark" viewBox="0 0 200 60" preserveAspectRatio="none" style={{ marginTop:12 }}>
              <path d="M0 45 L30 30 L60 20 L90 28 L120 16 L150 26 L180 10 L200 18" stroke="#04121d" strokeWidth="3" fill="none" opacity=".12"/>
              <path d="M0 50 L30 40 L60 30 L90 36 L120 22 L150 32 L180 18 L200 28" stroke="#fff" strokeWidth="2" fill="none"/>
            </svg>
          </div>
          <div className="card big-card">
            <h3 className="card-title">Recent Activity</h3>
            <div className="muted">Last notice</div>
            {notices[0] ? (<div><strong>{notices[0].title}</strong><div className="muted">{notices[0].createdAt ? new Date(notices[0].createdAt).toLocaleDateString() : ''}</div></div>) : (<div className="muted">—</div>)}
            <div style={{ marginTop:12 }}>
              <button className="btn classic" onClick={onRefresh}>Refresh</button>
            </div>
          </div>
        </div>
        <div className="card">
          <h3 className="card-title">Properties</h3>
          <div className="properties-list">
            {estates.length === 0 ? <div className="muted">No properties</div> : estates.map(e => (
              <div key={e.id} className="property-item">
                <div className="property-meta"><strong>{e.name}</strong><div className="muted">{e.address}</div></div>
                <div className="property-stats"><div className="muted">{(e.Apartments||[]).length} units</div></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

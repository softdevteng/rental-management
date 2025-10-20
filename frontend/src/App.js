import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { BrowserRouter, Routes, Route, Link, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { api } from './lib/api';
import { AuthProvider, useAuth } from './lib/auth';
import Layout from './components/Layout';

// Simple Toast system (with optional action button)
const ToastContext = React.createContext(null);
function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const add = (msg, type = 'info', action) => {
    const id = Date.now() + Math.random();
    setToasts(t => [...t, { id, msg, type, action }]);
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 3500);
  };
  const api = useMemo(() => ({ add }), []);
  return (
    <ToastContext.Provider value={api}>
      {children}
      <div style={{ position: 'fixed', top: 16, right: 16, zIndex: 9999 }}>
        {toasts.map(t => (
          <div key={t.id} style={{ display:'flex', alignItems:'center', gap:8, marginBottom: 8, padding: '8px 12px', borderRadius: 6, color: '#fff', background: t.type==='error'?'#e11d48': t.type==='success'?'#16a34a':'#2563eb' }}>
            <span style={{ lineHeight:1.2 }}>{t.msg}</span>
            {t.action && (
              <button onClick={t.action.onClick} className="btn classic" style={{ padding:'4px 8px', height:26 }}>
                {t.action.label || 'Action'}
              </button>
            )}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
const useToast = () => React.useContext(ToastContext);
function TenantDashboard() {
  const { token } = useAuth();
  const nav = useNavigate();
  const [initialized, setInitialized] = React.useState(false);
  const toast = useToast();
  const [payments, setPayments] = React.useState([]);
  const [notices, setNotices] = React.useState([]);
  const prevNoticeIdsRef = React.useRef(new Set());
  const [desc, setDesc] = React.useState('');
  const [noticeMsg, setNoticeMsg] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [tickets, setTickets] = React.useState([]);
  const [kpis, setKpis] = React.useState({ due: 0, paid: 0, openTickets: 0 });
  const [ticketFilter, setTicketFilter] = React.useState('');
  const [ticketStatus, setTicketStatus] = React.useState('');
  const [ticketFrom, setTicketFrom] = React.useState('');
  const [ticketTo, setTicketTo] = React.useState('');
  const [me, setMe] = React.useState(null);
  const [activeTab, setActiveTab] = React.useState('notices');
  // Sidebar is always visible; no toggle per requirements

  React.useEffect(() => {
    (async () => {
      try {
        const pay = await api('/api/tenants/payments', { token });
        setPayments(pay);
        const tks = await api('/api/tenants/tickets', { token });
        setTickets(tks);
  const profile = await api('/api/tenants/me', { token });
  setMe(profile);
        const estateId = profile?.Apartment?.Estate?.id;
        if (estateId) {
          const ns = await api(`/api/notices/estate/${estateId}`, { token });
          setNotices(ns);
          try { prevNoticeIdsRef.current = new Set((ns||[]).map(n=>n.id)); } catch {}
        }
        const paid = pay.filter(p=>p.status==='paid').length;
        const due = pay.filter(p=>p.status!=='paid').length;
        const openTickets = tks.filter(t=>t.status!=='closed').length;
        setKpis({ paid, due, openTickets });
      } catch {}
    })();
  }, [token]);

  const refreshTenantNotices = useCallback(async () => {
    try {
      const estateId = me?.Apartment?.Estate?.id;
      if (!estateId) return;
      const ns = await api(`/api/notices/estate/${estateId}`, { token });
      // Compare ids to detect new notices
      const prev = prevNoticeIdsRef.current || new Set();
      const currentSet = new Set((ns||[]).map(n=>n.id));
      let newCount = 0;
      for (const n of ns || []) if (!prev.has(n.id)) newCount++;
      // Avoid toasting on the very first load (when prev is empty)
      if (prev.size > 0 && newCount > 0) {
        toast.add(`${newCount} new notice${newCount>1?'s':''} posted`, 'info');
      }
      prevNoticeIdsRef.current = currentSet;
      setNotices(ns);
    } catch {}
  }, [me, token, toast]);

  // Light polling while viewing notices to keep in sync with landlord posts
  React.useEffect(() => {
    if (activeTab !== 'notices') return;
    // initial refresh
    refreshTenantNotices();
    const id = setInterval(refreshTenantNotices, 20000);
    return () => clearInterval(id);
  }, [activeTab, refreshTenantNotices]);

  React.useEffect(() => {
    // open profile if navigated with state
    const st = window.history.state && window.history.state.usr;
    if (!initialized) {
      if (st && st.openProfile) setActiveTab('profile');
      setInitialized(true);
    }
  }, [initialized]);

  const filteredTickets = React.useMemo(() => {
    return tickets.filter(t => {
      const q = ticketFilter.toLowerCase();
      const textOk = q ? (t.description || '').toLowerCase().includes(q) : true;
      const statusOk = ticketStatus ? t.status === ticketStatus : true;
      const created = t.createdAt ? new Date(t.createdAt) : null;
      const fromOk = ticketFrom ? (created ? created >= new Date(ticketFrom) : false) : true;
      const toOk = ticketTo ? (created ? created <= new Date(ticketTo) : false) : true;
      return textOk && statusOk && fromOk && toOk;
    });
  }, [tickets, ticketFilter, ticketStatus, ticketFrom, ticketTo]);

  const scopedKPIs = React.useMemo(() => kpis, [kpis]);

  const raiseTicket = async (e) => {
    e.preventDefault(); setLoading(true);
    try {
      if (!desc.trim()) throw new Error('Description is required');
      const created = await api('/api/tenants/tickets', { method:'POST', body:{ description: desc }, token });
      setTickets(ts => [created, ...ts]);
      setDesc('');
      toast.add('Ticket submitted', 'success');
    }
    catch(err){ toast.add(err.message, 'error'); }
    finally { setLoading(false); }
  };

  const vacate = async () => {
    setLoading(true);
    try { await api('/api/tenants/vacate', { method:'POST', token }); setNoticeMsg('Vacate notice submitted.'); toast.add('Vacate notice submitted', 'success'); }
    catch(err){ toast.add(err.message, 'error'); }
    finally { setLoading(false); }
  };

  return (
    <div className="dashboard">
      <aside className="sidebar">
        <div className="sidebar-section">
          <div className="sidebar-title">Tenant</div>
          <button className={`side-item ${activeTab==='profile'?'active':''}`} onClick={()=>setActiveTab('profile')}><span className="dot" aria-hidden>👤</span> Profile</button>
          <button className={`side-item ${activeTab==='notices'?'active':''}`} onClick={()=>setActiveTab('notices')}><span className="dot" aria-hidden>📢</span> Notices</button>
          <button className={`side-item ${activeTab==='payments'?'active':''}`} onClick={()=>setActiveTab('payments')}><span className="dot" aria-hidden>💳</span> Payment History</button>
          <button className={`side-item ${activeTab==='tickets'?'active':''}`} onClick={()=>setActiveTab('tickets')}><span className="dot" aria-hidden>🎟️</span> My Tickets</button>
          <button className={`side-item ${activeTab==='raise'?'active':''}`} onClick={()=>setActiveTab('raise')}><span className="dot" aria-hidden>➕</span> Raise Ticket</button>
          <button className={`side-item ${activeTab==='vacate'?'active':''}`} onClick={()=>setActiveTab('vacate')}><span className="dot" aria-hidden>🚪</span> Vacate Notice</button>
          <button className={`side-item ${activeTab==='pay'?'active':''}`} onClick={()=>setActiveTab('pay')}><span className="dot" aria-hidden>📱</span> Pay Rent</button>
        </div>
      </aside>
      <section className="content">
  <h2 className="section-title compact">Welcome, {me?.name || 'Tenant'}</h2>
        {/* Overview */}
        <div className="grid" style={{ marginBottom:12 }}>
          <div className="card card-appear">
            <h3>Rent status</h3>
            <div className="gauge">
              {(() => { const total = payments.length||1; const paid = payments.filter(p=>p.status==='paid').length; const pct = Math.round((paid/total)*100); const r=28; const c=2*Math.PI*r; const off = c*(1-pct/100); return (
                <svg viewBox="0 0 80 80"><circle className="ring" cx="40" cy="40" r="28" fill="none" strokeWidth="8"/><circle className="meter" cx="40" cy="40" r="28" fill="none" strokeWidth="8" strokeDasharray={c} strokeDashoffset={off} strokeLinecap="round"/></svg>
              ); })()}
              <div><div className="muted">Paid</div><div className="val"><strong>{payments.filter(p=>p.status==='paid').length}</strong> / {payments.length||0}</div></div>
            </div>
          </div>
          <div className="card card-appear">
            <h3>Tickets trend</h3>
            <svg className="spark" viewBox="0 0 100 40" preserveAspectRatio="none"><path d="M0 30 L20 18 L40 22 L60 14 L80 20 L100 12"/></svg>
            <div className="muted">Last 6 cycles</div>
          </div>
          <div className="card card-appear">
            <h3>Next steps</h3>
            <div className="muted">Raise a ticket or pay rent online via M-Pesa.</div>
          </div>
        </div>
        {/* Recent Activity */}
        <div className="card" style={{ marginBottom: 12 }}>
          <div className="card-header">
            <svg className="icon" viewBox="0 0 24 24" fill="none"><path d="M3 7h18M3 12h12M3 17h8" stroke="#5bc0be" strokeWidth="1.5"/></svg>
            <h3 className="card-title">Recent Activity</h3>
          </div>
          <div className="grid" style={{ gridTemplateColumns:'repeat(auto-fit,minmax(180px,1fr))' }}>
            <div>
              <div className="muted">Last notice</div>
              {(() => { const ns = Array.isArray(notices)? [...notices] : []; ns.sort((a,b)=> new Date(b.createdAt||0)-new Date(a.createdAt||0)); const n = ns[0]; return n ? (<div><strong>{n.title}</strong><div className="muted">{n.createdAt? new Date(n.createdAt).toLocaleDateString():''}</div></div>) : (<div className="muted">—</div>); })()}
            </div>
            <div>
              <div className="muted">Last payment</div>
              {(() => { const ps = Array.isArray(payments)? [...payments] : []; ps.sort((a,b)=> new Date(b.date||0)-new Date(a.date||0)); const p = ps[0]; return p ? (<div><strong>KSh {Number(p.amount||0).toLocaleString()}</strong><div className="muted">{p.status} · {p.date? new Date(p.date).toLocaleDateString():''}</div></div>) : (<div className="muted">—</div>); })()}
            </div>
            <div>
              <div className="muted">Last ticket</div>
              {(() => { const ts = Array.isArray(tickets)? [...tickets] : []; ts.sort((a,b)=> new Date(b.createdAt||0)-new Date(a.createdAt||0)); const t = ts[0]; return t ? (<div><strong>{t.status}</strong><div className="muted">{t.createdAt? new Date(t.createdAt).toLocaleDateString():''}</div></div>) : (<div className="muted">—</div>); })()}
            </div>
          </div>
        </div>
        {activeTab==='notices' && (
          <>
            <div className="kpis">
              <div className="kpi"><div className="kpi-label">Payments due</div><div className="kpi-value">{scopedKPIs.due}</div></div>
              <div className="kpi"><div className="kpi-label">Payments paid</div><div className="kpi-value">{scopedKPIs.paid}</div></div>
              <div className="kpi"><div className="kpi-label">Open tickets</div><div className="kpi-value">{scopedKPIs.openTickets}</div></div>
            </div>
            <div className="card card-appear">
              <div className="card-header" style={{ justifyContent:'space-between' }}>
                <svg className="icon" viewBox="0 0 24 24" fill="none"><path d="M4 6h16M6 10h12M8 14h8" stroke="#5bc0be" strokeWidth="1.5"/></svg>
                <h3 className="card-title" style={{ marginRight:'auto' }}>Notice Board</h3>
                <button className="btn classic" onClick={refreshTenantNotices}>Refresh</button>
              </div>
              <ul>
                {notices.length === 0 ? (
                  <li className="muted">No notices at the moment.</li>
                ) : (
                  notices.map(n => (
                    <li key={n.id}><strong>{n.title}</strong> — {n.createdAt ? new Date(n.createdAt).toLocaleDateString() : '-'}<br/>{n.message}</li>
                  ))
                )}
              </ul>
            </div>
          </>
        )}
        {activeTab==='payments' && (
          <div className="card card-appear">
            <div className="card-header">
              <svg className="icon" viewBox="0 0 24 24" fill="none"><path d="M3 7h18M3 12h18M3 17h18" stroke="#5bc0be" strokeWidth="1.5"/></svg>
              <h3 className="card-title">Payment History</h3>
            </div>
            <table className="table">
              <thead><tr><th>Date</th><th>Amount</th><th>Status</th></tr></thead>
              <tbody>
                {payments.length === 0 ? (
                  <tr><td colSpan={3} className="muted">No payments yet.</td></tr>
                ) : (
                  payments.map(p => {
                    const badge = p.status === 'paid' ? 'ok' : (p.status === 'late' ? 'warn' : 'info');
                    return (
                      <tr key={p.id}>
                        <td>{p.date ? new Date(p.date).toLocaleDateString() : '-'}</td>
                        <td>{p.amount != null ? `KSh ${Number(p.amount).toLocaleString()}` : '-'}</td>
                        <td><span className={`badge ${badge}`}>{p.status}</span></td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}
        {activeTab==='tickets' && (
            <div className="card card-appear">
              <div className="card-header">
                <svg className="icon" viewBox="0 0 24 24" fill="none"><path d="M7 7h10v10H7z" stroke="#5bc0be" strokeWidth="1.5"/><path d="M9 12h6" stroke="#5bc0be" strokeWidth="1.5"/></svg>
                <h3 className="card-title">My Tickets</h3>
              </div>
              <div className="filters">
                <input placeholder="Search description" value={ticketFilter} onChange={e=>setTicketFilter(e.target.value)} />
                <select value={ticketStatus} onChange={e=>setTicketStatus(e.target.value)}>
                  <option value="">All statuses</option>
                  <option value="open">open</option>
                  <option value="in-progress">in-progress</option>
                  <option value="closed">closed</option>
                </select>
                <input type="date" value={ticketFrom} onChange={e=>setTicketFrom(e.target.value)} />
                <input type="date" value={ticketTo} onChange={e=>setTicketTo(e.target.value)} />
              </div>
              <table className="table">
                <thead><tr><th>Date</th><th>Description</th><th>Status</th></tr></thead>
                <tbody>
                  {filteredTickets.length === 0 ? (
                    <tr><td colSpan={3} className="muted">No tickets found.</td></tr>
                  ) : (
                    filteredTickets.map(t => {
                      const badge = t.status === 'closed' ? 'ok' : (t.status === 'in-progress' ? 'info' : 'warn');
                      return (
                        <tr key={t.id}>
                          <td>{t.createdAt ? new Date(t.createdAt).toLocaleDateString() : '-'}</td>
                          <td>{t.description}</td>
                          <td><span className={`badge ${badge}`}>{t.status}</span></td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          )}
        {activeTab==='raise' && (
          <div className="card card-appear">
            <div className="card-header">
              <svg className="icon" viewBox="0 0 24 24" fill="none"><path d="M12 3v18M3 12h18" stroke="#5bc0be" strokeWidth="1.5"/></svg>
              <h3 className="card-title">Raise Repair Ticket</h3>
            </div>
            <form onSubmit={raiseTicket}>
              <label>Description</label>
              <textarea value={desc} onChange={e=>setDesc(e.target.value)} />
              <button className="btn" disabled={loading}>Submit Ticket</button>
            </form>
          </div>
        )}
        {activeTab==='vacate' && (
          <div className="card card-appear">
            <div className="card-header">
              <svg className="icon" viewBox="0 0 24 24" fill="none"><path d="M6 7h12v10H6z" stroke="#5bc0be" strokeWidth="1.5"/><path d="M6 10h12" stroke="#5bc0be" strokeWidth="1.5"/></svg>
              <h3 className="card-title">Vacate Notice</h3>
            </div>
            <p>Provide a one-month notice to facilitate deposit refund.</p>
            <button className="btn" onClick={vacate} disabled={loading}>Submit Notice</button>
            {noticeMsg && <p>{noticeMsg}</p>}
          </div>
        )}
        {activeTab==='pay' && (
          <div className="card">
            <div className="card-header">
              <svg className="icon" viewBox="0 0 24 24" fill="none"><path d="M4 7h16v10H4z" stroke="#5bc0be" strokeWidth="1.5"/><path d="M8 12h8" stroke="#5bc0be" strokeWidth="1.5"/></svg>
              <h3 className="card-title">Pay Rent (M-Pesa - mock)</h3>
            </div>
            <TenantPay token={token} onPaid={async ()=>{ try { setPayments(await api('/api/tenants/payments', { token })); } catch {} }} />
          </div>
        )}
        {activeTab==='profile' && (
          <>
            <div className="card card-appear">
              <div className="card-header">
                <svg className="icon" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="8" r="3" stroke="#5bc0be" strokeWidth="1.5"/><path d="M4 20a8 8 0 0116 0" stroke="#5bc0be" strokeWidth="1.5"/></svg>
                <h3 className="card-title">My Profile</h3>
              </div>
              <div className="muted" style={{ marginBottom: 8 }}>
                <div><strong>Name:</strong> {me?.name || '-'}</div>
                <div><strong>ID Number:</strong> {me?.idNumber || me?.IDNumber || '-'}</div>
                <div><strong>Phone:</strong> {me?.phone || '-'}</div>
                <div><strong>Email:</strong> {me?.email || me?.User?.email || '-'}</div>
                <div><strong>Role:</strong> tenant</div>
                <div><strong>Created:</strong> {me?.createdAt ? new Date(me.createdAt).toLocaleString() : '-'}</div>
                <div><strong>Apartment:</strong> {me?.Apartment?.number || me?.apartmentId || '-'}</div>
                <div><strong>Estate:</strong> {me?.Apartment?.Estate?.name || '-'}</div>
              </div>
              <ProfileEditor role="tenant" token={token} me={me} onUpdated={async()=>{ try { setMe(await api('/api/tenants/me', { token })); } catch {} }} />
            </div>
          </>
        )}
      </section>
    </div>
  );
}

function RequireAuth({ role, children }) {
  const { token, role: myRole } = useAuth();
  const allowed = Array.isArray(role) ? role.includes(myRole) : (role ? myRole === role : true);
  if (!token) return <Navigate to="/signin" replace />;
  if (!allowed) return <Navigate to="/" replace />;
  return children;
}

function SignIn() {
  const toast = useToast();
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const onSubmit = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      const res = await api('/api/auth/login', { method:'POST', body:{ email, password } });
      if (res?.token && res?.role) {
        login(res.token, res.role);
        toast.add('Welcome back!', 'success');
        navigate(res.role === 'tenant' ? '/tenant' : '/landlord', { replace: true });
      } else {
        throw new Error('Invalid response from server');
      }
    } catch (err) {
      toast.add(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };
  return (
    <div className="auth-page with-illustration">
      <div className="auth-card">
        <h2 className="auth-title">Welcome back</h2>
        <p className="auth-subtitle">Sign in to manage your rentals</p>
        <form onSubmit={onSubmit}>
          <div className="field">
            <span className="field-icon" aria-hidden>
              <svg viewBox="0 0 24 24" fill="none"><path d="M3 7l9 6 9-6" stroke="#94a3b8" strokeWidth="1.5"/><rect x="3" y="5" width="18" height="14" rx="2" stroke="#94a3b8" strokeWidth="1.5"/></svg>
            </span>
            <input placeholder="Email" value={email} onChange={e=>setEmail(e.target.value)} disabled={loading} />
          </div>
          <div className="field">
            <span className="field-icon" aria-hidden>
              <svg viewBox="0 0 24 24" fill="none"><rect x="4" y="10" width="16" height="10" rx="2" stroke="#94a3b8" strokeWidth="1.5"/><path d="M8 10V7a4 4 0 018 0v3" stroke="#94a3b8" strokeWidth="1.5"/></svg>
            </span>
            <input placeholder="Password" type={showPassword?'text':'password'} value={password} onChange={e=>setPassword(e.target.value)} disabled={loading} />
            <button type="button" className="field-action" aria-label={showPassword? 'Hide password':'Show password'} onClick={()=>setShowPassword(s=>!s)}>
              {showPassword ? (
                <svg viewBox="0 0 24 24" fill="none"><path d="M3 3l18 18" stroke="#94a3b8" strokeWidth="1.5"/><path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7-10-7-10-7z" stroke="#94a3b8" strokeWidth="1.5"/></svg>
              ) : (
                <svg viewBox="0 0 24 24" fill="none"><path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7-10-7-10-7z" stroke="#94a3b8" strokeWidth="1.5"/><circle cx="12" cy="12" r="3" stroke="#94a3b8" strokeWidth="1.5"/></svg>
              )}
            </button>
          </div>
          <button className="btn full" disabled={loading}>{loading ? 'Signing in…' : 'Sign In'}</button>
        </form>
        <div className="auth-links">
          <Link to="/forgot-password">Forgot password?</Link>
          <span className="dot">•</span>
          <Link to="/register">Create account</Link>
        </div>
      </div>
    </div>
  );
}

function LandlordDashboard() {
  const { token, role } = useAuth();
  const [initialized, setInitialized] = React.useState(false);
  const toast = useToast();
  const [tickets, setTickets] = React.useState([]);
  const [estates, setEstates] = React.useState([]);
  const [payments, setPayments] = React.useState([]);
  const [title, setTitle] = React.useState('');
  const [message, setMessage] = React.useState('');
  const [estate, setEstate] = React.useState('');
  const [filterEstate, setFilterEstate] = React.useState('');
  const [filterApartment, setFilterApartment] = React.useState('');
  const [filterStatus, setFilterStatus] = React.useState('');
  const [filterFrom, setFilterFrom] = React.useState('');
  const [filterTo, setFilterTo] = React.useState('');
  const [estName, setEstName] = React.useState('');
  const [estAddr, setEstAddr] = React.useState('');
  const [assignEstateId, setAssignEstateId] = React.useState('');
  const [assignCaretakerId, setAssignCaretakerId] = React.useState('');
  const [deleteCaretakerId, setDeleteCaretakerId] = React.useState('');
  const [kpis, setKpis] = React.useState({ open:0, inProgress:0, closed:0 });
  const [displayName, setDisplayName] = React.useState('');
  const [me, setMe] = React.useState(null);
  const [activeTab, setActiveTab] = React.useState('notices');
  // Sidebar is always visible; no toggle per requirements
  const [landlordNotices, setLandlordNotices] = React.useState([]);
  const [payEstateId, setPayEstateId] = React.useState('');
  const [payAptId, setPayAptId] = React.useState('');
  const [payApts, setPayApts] = React.useState([]);
  const [payAptSearch, setPayAptSearch] = React.useState('');
  // Add Apartment
  const [addAptEstateId, setAddAptEstateId] = React.useState('');
  const [addAptNumber, setAddAptNumber] = React.useState('');
  const [addAptRent, setAddAptRent] = React.useState('');
  const [addAptDeposit, setAddAptDeposit] = React.useState('');
  // Landlord management: tenants & estates deletion
  const [ltName, setLtName] = React.useState('');
  const [ltIdNumber, setLtIdNumber] = React.useState('');
  const [ltEmail, setLtEmail] = React.useState('');
  const [ltPhone, setLtPhone] = React.useState('');
  const [llTenants, setLlTenants] = React.useState([]);
  const [llTenantsLoading, setLlTenantsLoading] = React.useState(false);
  const [delEstateId, setDelEstateId] = React.useState('');
  // Tenants & Invite state
  const [tenants, setTenants] = React.useState([]);
  const [tenantsLoading, setTenantsLoading] = React.useState(false);
  const [selectedTenant, setSelectedTenant] = React.useState(null);
  const [selectedTenantPayments, setSelectedTenantPayments] = React.useState([]);
  const [inviteEstateId, setInviteEstateId] = React.useState('');
  const [inviteApts, setInviteApts] = React.useState([]);
  const [inviteApartmentId, setInviteApartmentId] = React.useState('');
  const [inviteResult, setInviteResult] = React.useState(null);
  const [inviting, setInviting] = React.useState(false);
  // Assign Tenant to Apartment
  const [assignTenantEstateId, setAssignTenantEstateId] = React.useState('');
  const [assignTenantAptId, setAssignTenantAptId] = React.useState('');
  const [assignTenantApts, setAssignTenantApts] = React.useState([]);
  const [assignTenantId, setAssignTenantId] = React.useState('');
  const [assignAptSearch, setAssignAptSearch] = React.useState('');
  const [report, setReport] = React.useState(null);

  React.useEffect(() => {
    (async () => {
      try {
        const all = await api('/api/tickets', { token });
        setTickets(all);
        try {
          if (role === 'landlord') {
            const m = await api('/api/landlords/me', { token });
            setMe(m); setEstates(m?.Estates || []); setDisplayName(m?.name || 'Landlord');
          }
        } catch { setEstates([]); }
        if (role === 'caretaker') {
          try {
            const meCt = await api('/api/landlords/caretakers/me', { token });
            setMe(meCt); setDisplayName(meCt?.name || 'Caretaker');
            if (meCt?.apartmentId) setPayAptId(String(meCt.apartmentId));
          } catch {}
        }
        const open = all.filter(t=>t.status==='open').length;
        const inProgress = all.filter(t=>t.status==='in-progress').length;
        const closed = all.filter(t=>t.status==='closed').length;
        setKpis({ open, inProgress, closed });
        try {
          const ns = await api('/api/landlords/notices', { token });
          setLandlordNotices(ns);
        } catch {}
        try {
          const r = await api('/api/reports/summary', { token });
          setReport(r);
        } catch {}
      } catch {}
    })();
  }, [token, role]);

  React.useEffect(() => {
    const st = window.history.state && window.history.state.usr;
    if (!initialized) {
      if (st && st.openProfile) setActiveTab('profile');
      setInitialized(true);
    }
  }, [initialized]);

  React.useEffect(() => {
    (async () => {
      if (!payEstateId) { setPayApts([]); setPayAptId(''); return; }
      try {
        const list = await api(`/api/public/estates/${payEstateId}/apartments`);
        setPayApts(list);
      } catch {}
    })();
  }, [payEstateId]);

  // Load apartments for Invite flow when estate changes
  React.useEffect(() => {
    (async () => {
      if (!inviteEstateId) { setInviteApts([]); setInviteApartmentId(''); return; }
      try {
        const list = await api(`/api/public/estates/${inviteEstateId}/apartments`);
        setInviteApts(list);
      } catch {}
    })();
  }, [inviteEstateId]);

  // Load apartments for Assign Tenant flow when estate changes
  React.useEffect(() => {
    (async () => {
      if (!assignTenantEstateId) { setAssignTenantApts([]); setAssignTenantAptId(''); return; }
      try {
        const list = await api(`/api/public/estates/${assignTenantEstateId}/apartments`);
        setAssignTenantApts(list);
      } catch {}
    })();
  }, [assignTenantEstateId]);

  // Lazy-load tenants when Tenants, Delete Tenant, or Assign Tenant tab is opened
  React.useEffect(() => {
    if (!['tenants','delete-tenant','assign-tenant'].includes(activeTab) || role !== 'landlord') return;
    (async () => {
      try {
        setTenantsLoading(true);
        const data = await api('/api/landlords/tenants', { token });
        setTenants(data || []);
        setLlTenants(data || []);
      } catch (err) { toast.add(err.message, 'error'); }
      finally { setTenantsLoading(false); }
    })();
  }, [activeTab, role, token]);

  const applyFilter = async () => {
    const qs = new URLSearchParams();
    if (filterEstate) qs.set('estate', filterEstate);
    if (filterApartment) qs.set('apartment', filterApartment);
    if (filterStatus) qs.set('status', filterStatus);
    if (filterFrom) qs.set('from', filterFrom);
    if (filterTo) qs.set('to', filterTo);
    const data = await api(`/api/landlords/tickets?${qs.toString()}`, { token });
    setTickets(data);
  };

  const postNotice = async (e) => {
    e.preventDefault();
    try {
      if (!estate) throw new Error('Select an estate');
      if (!title.trim()) throw new Error('Title is required');
      if (!message.trim()) throw new Error('Message is required');
      const created = await api('/api/landlords/notices', { method:'POST', body:{ title, message, estate }, token });
      setLandlordNotices(prev => [created, ...(Array.isArray(prev) ? prev : [])]);
      setTitle(''); setMessage(''); setEstate('');
      toast.add('Notice posted', 'success');
    }
    catch(err){ toast.add(err.message, 'error'); }
  };

  const createEstate = async (e) => {
    e.preventDefault();
    try {
      if (!estName.trim()) throw new Error('Estate name is required');
      const created = await api('/api/landlords/estates', { method:'POST', token, body:{ name: estName, address: estAddr } });
      setEstates(es => [created, ...es]);
      setEstName(''); setEstAddr('');
      toast.add('Estate created', 'success');
    } catch (err) { toast.add(err.message, 'error'); }
  };

  const assignCaretaker = async (e) => {
    e.preventDefault();
    try {
      if (!assignEstateId || !assignCaretakerId) throw new Error('Estate and caretaker IDs required');
      await api(`/api/landlords/estates/${assignEstateId}/assign-caretaker`, { method:'POST', token, body:{ caretakerId: Number(assignCaretakerId) } });
      toast.add('Caretaker assigned', 'success');
      setAssignEstateId(''); setAssignCaretakerId('');
    } catch (err) { toast.add(err.message, 'error'); }
  };

  const deleteCaretaker = async (e) => {
    e.preventDefault();
    try {
      if (!deleteCaretakerId) throw new Error('Caretaker ID required');
      await api(`/api/landlords/caretakers/${deleteCaretakerId}`, { method:'DELETE', token });
      toast.add('Caretaker deleted', 'success');
      setDeleteCaretakerId('');
    } catch (err) { toast.add(err.message, 'error'); }
  };

  const updateTicket = async (id, status) => {
    try {
      const updated = await api(`/api/landlords/tickets/${id}/status`, { method:'PUT', body:{ status }, token });
      setTickets(ts => ts.map(t => t.id === id ? updated : t));
      toast.add('Ticket updated', 'success');
      setKpis(prev=>{
        const all = (tickets.map(t=> t.id===id? updated : t));
        return {
          open: all.filter(t=>t.status==='open').length,
          inProgress: all.filter(t=>t.status==='in-progress').length,
          closed: all.filter(t=>t.status==='closed').length,
        };
      });
    } catch(err){ alert(err.message); }
  };

  const landlordFiltered = tickets.filter(t => {
    const statusOk = filterStatus ? t.status === filterStatus : true;
    const created = t.createdAt ? new Date(t.createdAt) : null;
    const fromOk = filterFrom ? (created ? created >= new Date(filterFrom) : false) : true;
    const toOk = filterTo ? (created ? created <= new Date(filterTo) : false) : true;
    return statusOk && fromOk && toOk;
  });
  const landlordKPIs = {
    open: landlordFiltered.filter(t=>t.status==='open').length,
    inProgress: landlordFiltered.filter(t=>t.status==='in-progress').length,
    closed: landlordFiltered.filter(t=>t.status==='closed').length,
  };

  const loadPayments = async () => {
    try {
      if (!payAptId) throw new Error('Provide an apartment');
      const data = await api(`/api/landlords/apartments/${payAptId}/payments`, { token });
      setPayments(data);
    } catch (err) {
      toast.add(err.message, 'error');
    }
  };

  const paymentTotals = React.useMemo(() => {
    const paid = payments.filter(p=>p.status==='paid').reduce((s,p)=> s + (Number(p.amount||0)), 0);
    const due = payments.filter(p=>p.status!=='paid').reduce((s,p)=> s + (Number(p.amount||0)), 0);
    return { paid, due };
  }, [payments]);

  const exportPaymentsCsv = () => {
    if (!payments.length) { toast.add('No payments to export', 'info'); return; }
    const rows = [['Date','Amount','Status','TenantId','ApartmentId']];
    payments.forEach(p => rows.push([
      p.date ? new Date(p.date).toISOString().split('T')[0] : '',
      String(p.amount ?? ''),
      p.status ?? '',
      String(p.tenantId ?? ''),
      String(p.apartmentId ?? ''),
    ]));
    const csv = rows.map(r => r.map(v => `"${String(v).replace(/"/g,'""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'payments.csv'; a.click();
    URL.revokeObjectURL(url);
  };

  const viewTenantPayments = async (tenant) => {
    setSelectedTenant(tenant);
    try {
      const pays = await api(`/api/landlords/tenants/${tenant.id}/payments`, { token });
      setSelectedTenantPayments(pays || []);
    } catch (err) { toast.add(err.message, 'error'); }
  };

  const generateInvite = async (e) => {
    e.preventDefault();
    try {
      setInviting(true);
      const body = {};
      if (inviteEstateId) body.estateId = Number(inviteEstateId);
      if (inviteApartmentId) body.apartmentId = Number(inviteApartmentId);
      const res = await api('/api/landlords/caretakers/invite', { method:'POST', token, body });
      setInviteResult(res);
      toast.add('Invite code generated', 'success');
    } catch (err) { toast.add(err.message, 'error'); }
    finally { setInviting(false); }
  };

  return (
    <div className="dashboard">
      <aside className="sidebar">
        <div className="sidebar-section">
          <div className="sidebar-title">Manage</div>
          <button className={`side-item ${activeTab==='profile'?'active':''}`} onClick={()=>setActiveTab('profile')}>Profile</button>
          <button className={`side-item ${activeTab==='notices'?'active':''}`} onClick={()=>setActiveTab('notices')}>Notices</button>
          <button className={`side-item ${activeTab==='tickets'?'active':''}`} onClick={()=>setActiveTab('tickets')}>Tickets</button>
          <button className={`side-item ${activeTab==='post'?'active':''}`} onClick={()=>setActiveTab('post')}>Post Notice</button>
          <button className={`side-item ${activeTab==='estate'?'active':''}`} onClick={()=>setActiveTab('estate')}>Add Estate</button>
          <button className={`side-item ${activeTab==='add-apartment'?'active':''}`} onClick={()=>setActiveTab('add-apartment')}>Add Apartment</button>
          <button className={`side-item ${activeTab==='assign-tenant'?'active':''}`} onClick={()=>setActiveTab('assign-tenant')}>Assign Tenant</button>
          <button className={`side-item ${activeTab==='assign'?'active':''}`} onClick={()=>setActiveTab('assign')}>Assign Caretaker</button>
          {role === 'landlord' && (
            <button className={`side-item ${activeTab==='invite'?'active':''}`} onClick={()=>setActiveTab('invite')}>Invite Caretaker</button>
          )}
          <button className={`side-item ${activeTab==='delete'?'active':''}`} onClick={()=>setActiveTab('delete')}>Delete Caretaker</button>
          {role === 'landlord' && (
            <button className={`side-item ${activeTab==='tenants'?'active':''}`} onClick={()=>setActiveTab('tenants')}><span className="dot" aria-hidden>👥</span> Tenants</button>
          )}
            {role === 'landlord' && (
              <>
                <button className={`side-item ${activeTab==='add-tenant'?'active':''}`} onClick={()=>setActiveTab('add-tenant')}>Add Tenant</button>
                <button className={`side-item ${activeTab==='delete-tenant'?'active':''}`} onClick={()=>setActiveTab('delete-tenant')}>Delete Tenant</button>
                <button className={`side-item ${activeTab==='delete-estate'?'active':''}`} onClick={()=>setActiveTab('delete-estate')}>Delete Estate</button>
                <button className={`side-item ${activeTab==='delete-apartment'?'active':''}`} onClick={()=>setActiveTab('delete-apartment')}>Delete Apartment</button>
              </>
            )}
          <button className={`side-item ${activeTab==='reminders'?'active':''}`} onClick={()=>setActiveTab('reminders')}>Rent Reminders</button>
          <button className={`side-item ${activeTab==='payments'?'active':''}`} onClick={()=>setActiveTab('payments')}>Rent Payments</button>
          <button className={`side-item ${activeTab==='reports'?'active':''}`} onClick={()=>setActiveTab('reports')}>Reports</button>
          <button className={`side-item ${activeTab==='system'?'active':''}`} onClick={()=>setActiveTab('system')}>System</button>
        </div>
      </aside>
      <section className="content">
  <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:12 }}>
    <h2 className="section-title compact" style={{ marginBottom: 0 }}>Welcome, {displayName || (role==='caretaker' ? 'Caretaker' : 'Landlord')}</h2>
    <div className="card" style={{ padding:'8px 12px', display:'flex', alignItems:'center', gap:10, margin:0 }}>
      <div style={{ width:36, height:36, borderRadius:'50%', overflow:'hidden', background:'linear-gradient(135deg, var(--accent), var(--accent-2))', display:'flex', alignItems:'center', justifyContent:'center' }}>
        {me?.photoUrl ? (
          <img src={me.photoUrl} alt="avatar" style={{ width:'100%', height:'100%', objectFit:'cover' }} onError={(e)=>{ e.currentTarget.style.display='none'; }} />
        ) : (
          <span style={{ color:'#04121d', fontWeight:800 }}>{(me?.name||'U').slice(0,1).toUpperCase()}</span>
        )}
        {activeTab==='add-tenant' && role==='landlord' && (
          <div className="card">
            <div className="card-header">
              <svg className="icon" viewBox="0 0 24 24" fill="none"><path d="M12 4v16M4 12h16" stroke="#5bc0be" strokeWidth="1.5"/></svg>
              <h3 className="card-title">Add Tenant</h3>
            </div>
            <form onSubmit={async (e)=>{
              e.preventDefault();
              try {
                if (!ltName.trim() || !ltIdNumber.trim()) throw new Error('Name and ID number are required');
                const created = await api('/api/landlords/tenants', { method:'POST', token, body:{ name: ltName, idNumber: ltIdNumber, email: ltEmail || undefined, phone: ltPhone || undefined } });
                setLtName(''); setLtIdNumber(''); setLtEmail(''); setLtPhone('');
                toast.add('Tenant created', 'success');
              } catch (err) { toast.add(err.message, 'error'); }
            }}>
              <label>Name</label>
              <input value={ltName} onChange={e=>setLtName(e.target.value)} />
              <label>ID Number</label>
              <input value={ltIdNumber} onChange={e=>setLtIdNumber(e.target.value)} />
              <label>Email (optional)</label>
              <input value={ltEmail} onChange={e=>setLtEmail(e.target.value)} />
              <label>Phone (optional)</label>
              <input value={ltPhone} onChange={e=>setLtPhone(e.target.value)} />
              <button className="btn">Create Tenant</button>
            </form>
          </div>
        )}
        {activeTab==='delete-tenant' && role==='landlord' && (
          <div className="card">
            <div className="card-header">
              <svg className="icon" viewBox="0 0 24 24" fill="none"><path d="M6 7h12v10H6z" stroke="#5bc0be" strokeWidth="1.5"/></svg>
              <h3 className="card-title">Delete Tenant</h3>
            </div>
            {llTenantsLoading ? <div className="muted">Loading…</div> : (
              <table className="table">
                <thead><tr><th>Name</th><th>ID Number</th><th>Apartment</th><th>Estate</th><th>Action</th></tr></thead>
                <tbody>
                  {llTenants.length === 0 ? (
                    <tr><td colSpan={5} className="muted">No tenants found.</td></tr>
                  ) : llTenants.map(t => (
                    <tr key={t.id}>
                      <td>{t.name || '—'}</td>
                      <td>{t.idNumber || '—'}</td>
                      <td>{t.Apartment?.number || '—'}</td>
                      <td>{t.Apartment?.Estate?.name || '—'}</td>
                      <td>
                        <button className="btn" onClick={async ()=>{
                          if (!window.confirm('Delete this tenant?')) return;
                          try {
                            await api(`/api/landlords/tenants/${t.id}`, { method:'DELETE', token });
                            setLlTenants(cur => cur.filter(x => x.id !== t.id));
                            toast.add('Tenant deleted', 'success');
                          } catch (err) { toast.add(err.message, 'error'); }
                        }}>Delete</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
        {activeTab==='delete-estate' && role==='landlord' && (
          <div className="card">
            <div className="card-header">
              <svg className="icon" viewBox="0 0 24 24" fill="none"><path d="M6 7h12v10H6z" stroke="#5bc0be" strokeWidth="1.5"/></svg>
              <h3 className="card-title">Delete Estate</h3>
            </div>
            <label>Select estate</label>
            <select value={delEstateId} onChange={e=>setDelEstateId(e.target.value)}>
              <option value="">Select…</option>
              {estates.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
            </select>
            <button className="btn" disabled={!delEstateId} onClick={async ()=>{
              if (!delEstateId) return;
              if (!window.confirm('Delete this estate and its apartments?')) return;
              try {
                await api(`/api/landlords/estates/${delEstateId}`, { method:'DELETE', token });
                setEstates(cur => cur.filter(x => String(x.id) !== String(delEstateId)));
                setDelEstateId('');
                toast.add('Estate deleted', 'success');
              } catch (err) { toast.add(err.message, 'error'); }
            }}>Delete Estate</button>
          </div>
        )}
        {activeTab==='delete-apartment' && role==='landlord' && (
          <div className="card">
            <div className="card-header">
              <svg className="icon" viewBox="0 0 24 24" fill="none"><path d="M6 7h12v10H6z" stroke="#5bc0be" strokeWidth="1.5"/></svg>
              <h3 className="card-title">Delete Apartment</h3>
            </div>
            <div className="filters">
              <select value={payEstateId} onChange={e=>setPayEstateId(e.target.value)}>
                <option value="">Select estate</option>
                {estates.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
              </select>
              <input placeholder="Filter by number" value={payAptSearch} onChange={e=>setPayAptSearch(e.target.value)} disabled={!payEstateId} />
              <select value={payAptId} onChange={e=>setPayAptId(e.target.value)} disabled={!payEstateId}>
                <option value="">Select apartment</option>
                {payApts
                  .filter(a => payAptSearch ? String(a.number||'').toLowerCase().includes(payAptSearch.toLowerCase()) : true)
                  .map(a => <option key={a.id} value={a.id}>{a.number || a.id}</option>)}
              </select>
              <button className="btn" disabled={!payAptId} onClick={async ()=>{
                if (!payAptId) return;
                if (!window.confirm('Delete this apartment?')) return;
                try {
                  await api(`/api/landlords/apartments/${payAptId}`, { method:'DELETE', token });
                  setPayApts(cur => cur.filter(x => String(x.id) !== String(payAptId)));
                  setPayAptId('');
                  toast.add('Apartment deleted', 'success');
                } catch (err) { toast.add(err.message, 'error'); }
              }}>Delete Apartment</button>
            </div>
          </div>
        )}
      </div>
      <div style={{ display:'flex', flexDirection:'column', lineHeight:1.2 }}>
        <strong style={{ fontSize:14 }}>{me?.name || displayName || (role==='caretaker'?'Caretaker':'Landlord')}</strong>
        <span className="muted" style={{ fontSize:12 }}>{role}</span>
      </div>
      {/* Edit button removed as requested */}
    </div>
          {/* Recent Activity */}
          <div className="card" style={{ margin:'12px 0' }}>
            <div className="card-header">
              <svg className="icon" viewBox="0 0 24 24" fill="none"><path d="M3 7h18M3 12h12M3 17h8" stroke="#5bc0be" strokeWidth="1.5"/></svg>
              <h3 className="card-title">Recent Activity</h3>
            </div>
            <div className="grid" style={{ gridTemplateColumns:'repeat(auto-fit,minmax(220px,1fr))' }}>
              <div>
                <div className="muted">Last notice</div>
                {(() => { const ns = Array.isArray(landlordNotices)? [...landlordNotices] : []; ns.sort((a,b)=> new Date(b.createdAt||0)-new Date(a.createdAt||0)); const n = ns[0]; return n ? (<div><strong>{n.title}</strong><div className="muted">{n.createdAt? new Date(n.createdAt).toLocaleDateString():''}</div></div>) : (<div className="muted">—</div>); })()}
              </div>
              <div>
                <div className="muted">Last ticket</div>
                {(() => { const ts = Array.isArray(tickets)? [...tickets] : []; ts.sort((a,b)=> new Date(b.createdAt||0)-new Date(a.createdAt||0)); const t = ts[0]; return t ? (<div><strong>{t.status}</strong><div className="muted">{t.createdAt? new Date(t.createdAt).toLocaleDateString():''}</div></div>) : (<div className="muted">—</div>); })()}
              </div>
            </div>
          </div>
  </div>
        {activeTab==='notices' && (
          <>
            <div className="kpis">
              <div className="kpi"><div className="kpi-label">Open</div><div className="kpi-value badge warn">{landlordKPIs.open}</div></div>
              <div className="kpi"><div className="kpi-label">In Progress</div><div className="kpi-value badge info">{landlordKPIs.inProgress}</div></div>
              <div className="kpi"><div className="kpi-label">Closed</div><div className="kpi-value badge ok">{landlordKPIs.closed}</div></div>
            </div>
            <div className="card card-appear">
              <div className="card-header">
                <svg className="icon" viewBox="0 0 24 24" fill="none"><path d="M4 6h16M6 10h12M8 14h8" stroke="#5bc0be" strokeWidth="1.5"/></svg>
                <h3 className="card-title">Notices</h3>
              </div>
              <ul>
                {landlordNotices.length === 0 ? (
                  <li className="muted">No notices yet.</li>
                ) : (
                  landlordNotices.map(n => (
                    <li key={n.id}><strong>{n.title}</strong> — {n.createdAt ? new Date(n.createdAt).toLocaleDateString() : '-'}<br/>{n.message}</li>
                  ))
                )}
              </ul>
            </div>
          </>
        )}
        {activeTab==='tenants' && role==='landlord' && (
          <div className="card card-appear">
            <div className="card-header">
              <svg className="icon" viewBox="0 0 24 24" fill="none"><path d="M4 7h16v10H4z" stroke="#5bc0be" strokeWidth="1.5"/><path d="M8 12h8" stroke="#5bc0be" strokeWidth="1.5"/></svg>
              <h3 className="card-title">Tenants</h3>
            </div>
            {tenantsLoading ? (
              <div className="muted">Loading…</div>
            ) : tenants.length === 0 ? (
              <div className="muted">No tenants to display.</div>
            ) : (
              <>
                <table className="table">
                  <thead><tr><th>Name</th><th>Apartment</th><th>Estate</th><th>Last Payment</th><th>Status</th><th>Actions</th></tr></thead>
                  <tbody>
                    {tenants.map(t => {
                      const pays = Array.isArray(t.Payments) ? t.Payments : [];
                      let last = null;
                      for (const p of pays) {
                        if (!p?.date) continue;
                        if (!last || new Date(p.date) > new Date(last.date)) last = p;
                      }
                      const badge = last?.status === 'paid' ? 'ok' : (last?.status === 'late' ? 'warn' : 'info');
                      return (
                        <tr key={t.id}>
                          <td>{t.name || t.User?.name || '—'}</td>
                          <td>{t.Apartment?.number || t.apartmentId || '—'}</td>
                          <td>{t.Apartment?.Estate?.name || '—'}</td>
                          <td>{last?.date ? new Date(last.date).toLocaleDateString() : '—'}</td>
                          <td><span className={`badge ${badge}`}>{last?.status || 'n/a'}</span></td>
                          <td><button className="btn" onClick={()=>viewTenantPayments(t)}>View Payments</button></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                {selectedTenant && (
                  <div className="card" style={{ marginTop:12 }}>
                    <div className="card-header">
                      <svg className="icon" viewBox="0 0 24 24" fill="none"><path d="M4 7h16v10H4z" stroke="#5bc0be" strokeWidth="1.5"/><path d="M8 12h8" stroke="#5bc0be" strokeWidth="1.5"/></svg>
                      <h3 className="card-title">Payments — {selectedTenant.name || selectedTenant.id}</h3>
                    </div>
                    <table className="table">
                      <thead><tr><th>Date</th><th>Amount</th><th>Status</th></tr></thead>
                      <tbody>
                        {selectedTenantPayments.length === 0 ? (
                          <tr><td colSpan={3} className="muted">No payments for this tenant.</td></tr>
                        ) : (
                          selectedTenantPayments.map(p => {
                            const badge2 = p.status === 'paid' ? 'ok' : (p.status === 'late' ? 'warn' : 'info');
                            return (
                              <tr key={p.id}>
                                <td>{p.date ? new Date(p.date).toLocaleDateString() : '-'}</td>
                                <td>{p.amount != null ? `KSh ${Number(p.amount).toLocaleString()}` : '-'}</td>
                                <td><span className={`badge ${badge2}`}>{p.status}</span></td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                )}
              </>
            )}
          </div>
        )}
        {activeTab==='reports' && (
          <div className="card">
            <div className="card-header">
              <svg className="icon" viewBox="0 0 24 24" fill="none"><path d="M4 4h16v16H4z" stroke="#5bc0be" strokeWidth="1.5"/><path d="M8 14l2-2 3 3 3-4" stroke="#5bc0be" strokeWidth="1.5"/></svg>
              <h3 className="card-title">Reports</h3>
            </div>
            {!report ? <div className="muted">Loading…</div> : (
              <div className="grid">
                <div className="card">
                  <h3>Occupancy</h3>
                  <div>Total units: <strong>{report.occupancy.total}</strong></div>
                  <div>Occupied: <strong>{report.occupancy.occupied}</strong></div>
                  <div>Vacant: <strong>{report.occupancy.vacant}</strong></div>
                </div>
                <div className="card">
                  <h3>Revenue</h3>
                  <div>Collected: <strong>KSh {Number(report.revenue.collected||0).toLocaleString()}</strong></div>
                  <div>Pending: <strong>KSh {Number(report.revenue.pending||0).toLocaleString()}</strong></div>
                </div>
              </div>
            )}
          </div>
        )}
        {activeTab==='system' && role==='landlord' && (
          <div className="card">
            <div className="card-header">
              <svg className="icon" viewBox="0 0 24 24" fill="none"><path d="M4 7h16v10H4z" stroke="#5bc0be" strokeWidth="1.5"/><path d="M12 7v6" stroke="#5bc0be" strokeWidth="1.5"/></svg>
              <h3 className="card-title">System Settings</h3>
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(220px,1fr))', gap:12 }}>
              <div className="card">
                <h3>Backup</h3>
                <p className="muted">Download a JSON export of your data.</p>
                <button className="btn" onClick={async ()=>{
                  try {
                    const res = await fetch((process.env.REACT_APP_API_BASE||'') + '/api/admin/backup', { headers:{ Authorization: `Bearer ${token}` } });
                    const blob = await res.blob();
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a'); a.href = url; a.download = 'rms-backup.json'; a.click(); URL.revokeObjectURL(url);
                  } catch (err) { alert(err.message); }
                }}>Download Backup</button>
              </div>
              <div className="card">
                <h3>Restore</h3>
                <p className="muted">Replace your data with a JSON backup. This cannot be undone.</p>
                <label className="btn classic" style={{ width:'fit-content' }}>
                  Upload JSON
                  <input type="file" accept="application/json" style={{ display:'none' }} onChange={async (e)=>{
                    const file = e.target.files && e.target.files[0]; if (!file) return;
                    try {
                      const text = await file.text();
                      const body = JSON.parse(text);
                      const res = await fetch((process.env.REACT_APP_API_BASE||'') + '/api/admin/restore?confirm=true', { method:'POST', headers:{ 'Content-Type':'application/json', Authorization:`Bearer ${token}` }, body: JSON.stringify(body) });
                      if (!res.ok) { const msg = await res.text(); throw new Error(msg || 'Restore failed'); }
                      alert('Restore complete');
                    } catch (err) { alert(err.message); }
                    e.target.value='';
                  }} />
                </label>
              </div>
            </div>
          </div>
        )}
        {activeTab==='tickets' && (
          <div className="card">
            <h3>Tickets</h3>
            <div style={{ marginBottom: 8 }}>
              <select value={filterEstate} onChange={e=>setFilterEstate(e.target.value)}>
                <option value="">All estates</option>
                {estates.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
              </select>
              <input style={{ marginLeft: 8 }} placeholder="Apartment ID (optional)" value={filterApartment} onChange={e=>setFilterApartment(e.target.value)} />
              <button className="btn" style={{ marginLeft: 8 }} onClick={applyFilter}>Apply</button>
            </div>
            <div className="filters">
              <select value={filterStatus} onChange={e=>setFilterStatus(e.target.value)}>
                <option value="">All statuses</option>
                <option value="open">open</option>
                <option value="in-progress">in-progress</option>
                <option value="closed">closed</option>
              </select>
              <input type="date" value={filterFrom} onChange={e=>setFilterFrom(e.target.value)} />
              <input type="date" value={filterTo} onChange={e=>setFilterTo(e.target.value)} />
            </div>
            <table className="table">
              <thead><tr><th>Tenant</th><th>Apartment</th><th>Status</th><th>Actions</th></tr></thead>
              <tbody>
                {landlordFiltered.map(t => (
                  <tr key={t.id}>
                    <td>{t.Tenant?.name || t.tenantId}</td>
                    <td>{t.Apartment?.number || t.apartmentId}</td>
                    <td>
                      <select value={t.status} onChange={e=>updateTicket(t.id, e.target.value)}>
                        <option value="open">open</option>
                        <option value="in-progress">in-progress</option>
                        <option value="closed">closed</option>
                      </select>
                    </td>
                    <td>
                      <button className="btn" onClick={()=>updateTicket(t.id,'in-progress')}>In Progress</button>{' '}
                      <button className="btn" onClick={()=>updateTicket(t.id,'closed')}>Close</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {activeTab==='post' && (
          <div className="card">
            <h3>Post Notice</h3>
            <form onSubmit={postNotice}>
              <label>Estate</label>
              <select value={estate} onChange={e=>setEstate(e.target.value)}>
                <option value="">Select an estate</option>
                {estates.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
              </select>
              <label>Title</label>
              <input value={title} onChange={e=>setTitle(e.target.value)} />
              <label>Message</label>
              <textarea value={message} onChange={e=>setMessage(e.target.value)} />
              <button className="btn">Publish Notice</button>
            </form>
          </div>
        )}
        {activeTab==='estate' && (
          <div className="card">
            <h3>Create Estate</h3>
            <form onSubmit={createEstate}>
              <label>Name</label>
              <input value={estName} onChange={e=>setEstName(e.target.value)} />
              <label>Address</label>
              <input value={estAddr} onChange={e=>setEstAddr(e.target.value)} />
              <button className="btn">Create</button>
            </form>
          </div>
        )}
        {activeTab==='add-apartment' && role==='landlord' && (
          <div className="card">
            <div className="card-header">
              <svg className="icon" viewBox="0 0 24 24" fill="none"><path d="M12 4v16M4 12h16" stroke="#5bc0be" strokeWidth="1.5"/></svg>
              <h3 className="card-title">Add Apartment</h3>
            </div>
            <form onSubmit={async (e)=>{
              e.preventDefault();
              try {
                if (!addAptEstateId) throw new Error('Select an estate');
                if (!addAptNumber.trim()) throw new Error('Apartment number is required');
                const rent = addAptRent ? Number(addAptRent) : 0;
                const deposit = addAptDeposit ? Number(addAptDeposit) : 0;
                await api(`/api/landlords/estates/${addAptEstateId}/apartments`, { method:'POST', token, body:{ number: addAptNumber, rent, deposit } });
                setAddAptNumber(''); setAddAptRent(''); setAddAptDeposit('');
                toast.add('Apartment created', 'success');
                // if viewing apartments for same estate, refresh list
                if (payEstateId && String(payEstateId) === String(addAptEstateId)) {
                  try { const list = await api(`/api/public/estates/${payEstateId}/apartments`); setPayApts(list); } catch {}
                }
              } catch (err) {
                toast.add(err.message, 'error');
              }
            }}>
              <label>Estate</label>
              <select value={addAptEstateId} onChange={e=>setAddAptEstateId(e.target.value)}>
                <option value="">Select an estate</option>
                {estates.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
              </select>
              <label>Apartment Number</label>
              <input value={addAptNumber} onChange={e=>setAddAptNumber(e.target.value)} />
              <div className="filters" style={{ marginTop: 8 }}>
                <input placeholder="Rent (optional)" value={addAptRent} onChange={e=>setAddAptRent(e.target.value)} />
                <input placeholder="Deposit (optional)" value={addAptDeposit} onChange={e=>setAddAptDeposit(e.target.value)} />
              </div>
              <button className="btn" style={{ marginTop: 8 }}>Create Apartment</button>
            </form>
          </div>
        )}
        {activeTab==='assign' && (
          <div className="card">
            <h3>Assign Caretaker</h3>
            <form onSubmit={assignCaretaker}>
              <label>Estate</label>
              <select value={assignEstateId} onChange={e=>setAssignEstateId(e.target.value)}>
                <option value="">Select an estate</option>
                {estates.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
              </select>
              <label>Caretaker ID</label>
              <input value={assignCaretakerId} onChange={e=>setAssignCaretakerId(e.target.value)} placeholder="e.g. 1" />
              <button className="btn">Assign</button>
            </form>
          </div>
        )}
        {activeTab==='assign-tenant' && role==='landlord' && (
          <div className="card">
            <div className="card-header">
              <svg className="icon" viewBox="0 0 24 24" fill="none"><path d="M12 4v16M4 12h16" stroke="#5bc0be" strokeWidth="1.5"/></svg>
              <h3 className="card-title">Assign Tenant to Apartment</h3>
            </div>
            <form onSubmit={async (e)=>{
              e.preventDefault();
              try {
                if (!assignTenantEstateId) throw new Error('Select an estate');
                if (!assignTenantAptId) throw new Error('Select an apartment');
                if (!assignTenantId) throw new Error('Select a tenant');
                await api(`/api/landlords/apartments/${assignTenantAptId}/assign-tenant`, { method:'POST', token, body:{ tenantId: Number(assignTenantId) } });
                toast.add('Tenant assigned to apartment', 'success');
                setAssignTenantEstateId(''); setAssignTenantAptId(''); setAssignTenantId(''); setAssignTenantApts([]);
              } catch (err) { toast.add(err.message, 'error'); }
            }}>
              <label>Estate</label>
              <select value={assignTenantEstateId} onChange={e=>setAssignTenantEstateId(e.target.value)}>
                <option value="">Select an estate</option>
                {estates.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
              </select>
              <label>Apartment</label>
              <div className="filters" style={{ marginBottom: 8 }}>
                <input placeholder="Filter by number" value={assignAptSearch} onChange={e=>setAssignAptSearch(e.target.value)} disabled={!assignTenantEstateId} />
              </div>
              <select value={assignTenantAptId} onChange={e=>setAssignTenantAptId(e.target.value)} disabled={!assignTenantEstateId}>
                <option value="">Select apartment</option>
                {assignTenantApts
                  .filter(a => assignAptSearch ? String(a.number||'').toLowerCase().includes(assignAptSearch.toLowerCase()) : true)
                  .map(a => <option key={a.id} value={a.id}>{a.number || a.id}</option>)}
              </select>
              <label>Tenant</label>
              {tenantsLoading ? (
                <div className="muted">Loading tenants…</div>
              ) : (
                <select value={assignTenantId} onChange={e=>setAssignTenantId(e.target.value)}>
                  <option value="">Select tenant</option>
                  {(llTenants.length ? llTenants : tenants).map(t => (
                    <option key={t.id} value={t.id}>{t.name || t.User?.name || `Tenant ${t.id}`}</option>
                  ))}
                </select>
              )}
              <button className="btn" style={{ marginTop: 8 }}>Assign Tenant</button>
            </form>
          </div>
        )}
        {activeTab==='delete' && (
          <div className="card">
            <h3>Delete Caretaker</h3>
            <form onSubmit={deleteCaretaker}>
              <label>Caretaker ID</label>
              <input value={deleteCaretakerId} onChange={e=>setDeleteCaretakerId(e.target.value)} placeholder="e.g. 1" />
              <button className="btn">Delete</button>
            </form>
          </div>
        )}
        {activeTab==='invite' && role==='landlord' && (
          <div className="card">
            <div className="card-header">
              <svg className="icon" viewBox="0 0 24 24" fill="none"><path d="M12 4v16M4 12h16" stroke="#5bc0be" strokeWidth="1.5"/></svg>
              <h3 className="card-title">Invite Caretaker</h3>
            </div>
            <form onSubmit={generateInvite}>
              <label>Estate (optional)</label>
              <select value={inviteEstateId} onChange={e=>setInviteEstateId(e.target.value)}>
                <option value="">None</option>
                {estates.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
              </select>
              <label>Apartment (optional)</label>
              <select value={inviteApartmentId} onChange={e=>setInviteApartmentId(e.target.value)} disabled={!inviteEstateId}>
                <option value="">None</option>
                {inviteApts.map(a => <option key={a.id} value={a.id}>{a.number || a.id}</option>)}
              </select>
              <button className="btn" disabled={inviting}>{inviting ? 'Generating…' : 'Generate Invite Code'}</button>
            </form>
            {inviteResult?.code && (
              <div style={{ marginTop: 12 }}>
                <div className="muted">Share this code with the caretaker to register:</div>
                <div style={{ display:'flex', gap:8, alignItems:'center', marginTop:6 }}>
                  <code style={{ padding:'4px 8px', borderRadius:6, background:'var(--panel)' }}>{inviteResult.code}</code>
                  <button className="btn classic" onClick={()=>{ navigator.clipboard?.writeText(inviteResult.code); toast.add('Copied', 'success'); }}>Copy</button>
                </div>
              </div>
            )}
          </div>
        )}
        {activeTab==='reminders' && (
          <div className="card">
            <h3>Send Rent Reminders</h3>
            <LandlordReminders token={token} estates={estates} />
          </div>
        )}
        {activeTab==='payments' && (
          <div className="card">
            <div className="card-header">
              <svg className="icon" viewBox="0 0 24 24" fill="none"><path d="M4 7h16v10H4z" stroke="#5bc0be" strokeWidth="1.5"/><path d="M8 12h8" stroke="#5bc0be" strokeWidth="1.5"/></svg>
              <h3 className="card-title">Rent Payments</h3>
            </div>
            {estates.length > 0 ? (
              <div className="filters">
                <select value={payEstateId} onChange={e=>setPayEstateId(e.target.value)}>
                  <option value="">Select estate</option>
                  {estates.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
                </select>
                <input placeholder="Filter by number" value={payAptSearch} onChange={e=>setPayAptSearch(e.target.value)} disabled={!payEstateId} />
                <select value={payAptId} onChange={e=>setPayAptId(e.target.value)} disabled={!payEstateId}>
                  <option value="">Select apartment</option>
                  {payApts
                    .filter(a => payAptSearch ? String(a.number||'').toLowerCase().includes(payAptSearch.toLowerCase()) : true)
                    .map(a => <option key={a.id} value={a.id}>{a.number || a.id}</option>)}
                </select>
                <button className="btn" onClick={loadPayments}>Load Payments</button>
              </div>
            ) : (
              <div className="filters">
                <input placeholder="Apartment ID" value={payAptId} onChange={e=>setPayAptId(e.target.value)} />
                <button className="btn" onClick={loadPayments}>Load Payments</button>
              </div>
            )}
            <div className="muted" style={{ display:'flex', justifyContent:'space-between', alignItems:'center', margin:'8px 0' }}>
              <div>
                Collected: <strong>KSh {paymentTotals.paid.toLocaleString()}</strong>
                {' '}· Due: <strong>KSh {paymentTotals.due.toLocaleString()}</strong>
                {' '}· Count: {payments.length}
              </div>
              <button className="btn classic" onClick={exportPaymentsCsv}>Export CSV</button>
            </div>
            <table className="table">
              <thead><tr><th>Date</th><th>Amount</th><th>Status</th></tr></thead>
              <tbody>
                {payments.length === 0 ? (
                  <tr><td colSpan={3} className="muted">No payments to display.</td></tr>
                ) : (
                  payments.map(p => {
                    const badge = p.status === 'paid' ? 'ok' : (p.status === 'late' ? 'warn' : 'info');
                    return (
                      <tr key={p.id}>
                        <td>{p.date ? new Date(p.date).toLocaleDateString() : '-'}</td>
                        <td>{p.amount != null ? `KSh ${Number(p.amount).toLocaleString()}` : '-'}</td>
                        <td><span className={`badge ${badge}`}>{p.status}</span></td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}
        {activeTab==='profile' && (
          <div className="card">
            <div className="card-header">
              <svg className="icon" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="8" r="3" stroke="#5bc0be" strokeWidth="1.5"/><path d="M4 20a8 8 0 0116 0" stroke="#5bc0be" strokeWidth="1.5"/></svg>
              <h3 className="card-title">My Profile</h3>
            </div>
            <div className="muted" style={{ marginBottom: 8 }}>
              <div><strong>Name:</strong> {me?.name || '-'}</div>
              <div><strong>ID Number:</strong> {me?.idNumber || me?.IDNumber || '-'}</div>
              <div><strong>Phone:</strong> {me?.phone || '-'}</div>
              <div><strong>Email:</strong> {me?.email || me?.User?.email || '-'}</div>
              <div><strong>Role:</strong> {role}</div>
              <div><strong>Created:</strong> {me?.createdAt ? new Date(me.createdAt).toLocaleString() : '-'}</div>
              {role==='caretaker' && (
                <>
                  <div><strong>Apartment:</strong> {me?.Apartment?.number || me?.apartmentId || '-'}</div>
                  <div><strong>Estate:</strong> {me?.Apartment?.Estate?.name || '-'}</div>
                </>
              )}
            </div>
            <ProfileEditor role={role} token={token} me={me} onUpdated={async()=>{
              try {
                if (role === 'landlord') setMe(await api('/api/landlords/me', { token }));
                else if (role === 'caretaker') setMe(await api('/api/landlords/caretakers/me', { token }));
              } catch {}
            }} />
          </div>
        )}
      </section>
    </div>
  );
}

function CaretakerDashboard() {
  const { token } = useAuth();
  const toast = useToast();
  const [me, setMe] = React.useState(null);
  const [tickets, setTickets] = React.useState([]);
  const [notices, setNotices] = React.useState([]);
  const [activeTab, setActiveTab] = React.useState('tickets');
  const [kpis, setKpis] = React.useState({ open:0, inProgress:0, closed:0 });
  const [title, setTitle] = React.useState('');
  const [message, setMessage] = React.useState('');
  const [report, setReport] = React.useState(null);
  const [recTenant, setRecTenant] = React.useState('');
  const [recApartment, setRecApartment] = React.useState('');
  const [recAmount, setRecAmount] = React.useState('');

  React.useEffect(() => {
    (async () => {
      try {
        const profile = await api('/api/landlords/caretakers/me', { token });
        setMe(profile);
      } catch {}
      try {
        const list = await api('/api/landlords/tickets', { token });
        setTickets(list);
        const open = list.filter(t=>t.status==='open').length;
        const inProgress = list.filter(t=>t.status==='in-progress').length;
        const closed = list.filter(t=>t.status==='closed').length;
        setKpis({ open, inProgress, closed });
      } catch {}
      try {
        const ns = await api('/api/landlords/notices', { token });
        setNotices(ns);
      } catch {}
      try {
        const r = await api('/api/reports/summary', { token });
        setReport(r);
      } catch {}
    })();
  }, [token]);

  const updateTicket = async (id, status) => {
    try {
      const updated = await api(`/api/landlords/tickets/${id}/status`, { method:'PUT', token, body:{ status } });
      setTickets(ts => ts.map(t => t.id === id ? updated : t));
      toast.add('Ticket updated', 'success');
    } catch (err) { toast.add(err.message, 'error'); }
  };

  const postNotice = async (e) => {
    e.preventDefault();
    try {
      if (!me?.estateId && !me?.Estate?.id) throw new Error('No assigned estate');
      if (!title.trim()) throw new Error('Title is required');
      if (!message.trim()) throw new Error('Message is required');
      const estate = me?.Estate?.id || me?.estateId;
      const created = await api('/api/landlords/notices', { method:'POST', token, body:{ title, message, estate } });
      setNotices(prev => [created, ...(Array.isArray(prev)? prev:[])]);
      setTitle(''); setMessage('');
      toast.add('Notice posted', 'success');
    } catch (err) { toast.add(err.message, 'error'); }
  };

  return (
    <div className="dashboard">
      <aside className="sidebar">
        <div className="sidebar-section">
          <div className="sidebar-title">Caretaker</div>
          <button className={`side-item ${activeTab==='profile'?'active':''}`} onClick={()=>setActiveTab('profile')}>Profile</button>
          <button className={`side-item ${activeTab==='tickets'?'active':''}`} onClick={()=>setActiveTab('tickets')}>Tickets</button>
          <button className={`side-item ${activeTab==='post'?'active':''}`} onClick={()=>setActiveTab('post')}>Post Notice</button>
          <button className={`side-item ${activeTab==='notices'?'active':''}`} onClick={()=>setActiveTab('notices')}>Notices</button>
          <button className={`side-item ${activeTab==='record'?'active':''}`} onClick={()=>setActiveTab('record')}>Record Payment</button>
          <button className={`side-item ${activeTab==='reports'?'active':''}`} onClick={()=>setActiveTab('reports')}>Reports</button>
        </div>
      </aside>
      <section className="content">
        <h2 className="section-title compact">Welcome, {me?.name || 'Caretaker'}</h2>
        <div className="kpis">
          <div className="kpi"><div className="kpi-label">Open</div><div className="kpi-value badge warn">{kpis.open}</div></div>
          <div className="kpi"><div className="kpi-label">In Progress</div><div className="kpi-value badge info">{kpis.inProgress}</div></div>
          <div className="kpi"><div className="kpi-label">Closed</div><div className="kpi-value badge ok">{kpis.closed}</div></div>
        </div>
        {activeTab==='tickets' && (
          <div className="card">
            <div className="card-header">
              <svg className="icon" viewBox="0 0 24 24" fill="none"><path d="M7 7h10v10H7z" stroke="#5bc0be" strokeWidth="1.5"/><path d="M9 12h6" stroke="#5bc0be" strokeWidth="1.5"/></svg>
              <h3 className="card-title">Tickets</h3>
            </div>
            <table className="table">
              <thead><tr><th>Tenant</th><th>Apartment</th><th>Status</th><th>Actions</th></tr></thead>
              <tbody>
                {tickets.map(t => (
                  <tr key={t.id}>
                    <td>{t.Tenant?.name || t.tenantId}</td>
                    <td>{t.Apartment?.number || t.apartmentId}</td>
                    <td><span className={`badge ${t.status==='closed'?'ok':t.status==='in-progress'?'info':'warn'}`}>{t.status}</span></td>
                    <td>
                      <select value={t.status} onChange={e=>updateTicket(t.id, e.target.value)}>
                        <option value="open">open</option>
                        <option value="in-progress">in-progress</option>
                        <option value="closed">closed</option>
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {activeTab==='post' && (
          <div className="card">
            <div className="card-header">
              <svg className="icon" viewBox="0 0 24 24" fill="none"><path d="M12 3v18M3 12h18" stroke="#5bc0be" strokeWidth="1.5"/></svg>
              <h3 className="card-title">Post Notice</h3>
            </div>
            <form onSubmit={postNotice}>
              <label>Title</label>
              <input value={title} onChange={e=>setTitle(e.target.value)} />
              <label>Message</label>
              <textarea value={message} onChange={e=>setMessage(e.target.value)} />
              <button className="btn">Post</button>
            </form>
          </div>
        )}
        {activeTab==='notices' && (
          <div className="card">
            <div className="card-header">
              <svg className="icon" viewBox="0 0 24 24" fill="none"><path d="M4 6h16M6 10h12M8 14h8" stroke="#5bc0be" strokeWidth="1.5"/></svg>
              <h3 className="card-title">Notices</h3>
            </div>
            <ul>
              {notices.length === 0 ? (
                <li className="muted">No notices yet.</li>
              ) : (
                notices.map(n => (
                  <li key={n.id}><strong>{n.title}</strong> — {n.createdAt ? new Date(n.createdAt).toLocaleDateString() : '-'}<br/>{n.message}</li>
                ))
              )}
            </ul>
          </div>
        )}
        {activeTab==='record' && (
          <div className="card">
            <div className="card-header">
              <svg className="icon" viewBox="0 0 24 24" fill="none"><path d="M4 7h16v10H4z" stroke="#5bc0be" strokeWidth="1.5"/><path d="M8 12h8" stroke="#5bc0be" strokeWidth="1.5"/></svg>
              <h3 className="card-title">Record Payment</h3>
            </div>
            <form onSubmit={async (e)=>{
              e.preventDefault();
              try {
                if (!recTenant || !recApartment || !recAmount) throw new Error('All fields required');
                await api('/api/payments', { method:'POST', token, body:{ tenant: Number(recTenant), apartment: Number(recApartment), amount: Number(recAmount) } });
                setRecTenant(''); setRecApartment(''); setRecAmount('');
                toast.add('Payment recorded', 'success');
              } catch (err) { toast.add(err.message, 'error'); }
            }}>
              <label>Tenant ID</label>
              <input value={recTenant} onChange={e=>setRecTenant(e.target.value)} />
              <label>Apartment ID</label>
              <input value={recApartment} onChange={e=>setRecApartment(e.target.value)} />
              <label>Amount (KSh)</label>
              <input value={recAmount} onChange={e=>setRecAmount(e.target.value)} />
              <button className="btn">Save</button>
            </form>
          </div>
        )}
        {activeTab==='reports' && (
          <div className="card">
            <div className="card-header">
              <svg className="icon" viewBox="0 0 24 24" fill="none"><path d="M4 4h16v16H4z" stroke="#5bc0be" strokeWidth="1.5"/><path d="M8 14l2-2 3 3 3-4" stroke="#5bc0be" strokeWidth="1.5"/></svg>
              <h3 className="card-title">Reports</h3>
            </div>
            {!report ? <div className="muted">Loading…</div> : (
              <div className="grid">
                <div className="card">
                  <h3>Occupancy</h3>
                  <div>Total units: <strong>{report.occupancy.total}</strong></div>
                  <div>Occupied: <strong>{report.occupancy.occupied}</strong></div>
                  <div>Vacant: <strong>{report.occupancy.vacant}</strong></div>
                </div>
                <div className="card">
                  <h3>Revenue</h3>
                  <div>Collected: <strong>KSh {Number(report.revenue.collected||0).toLocaleString()}</strong></div>
                  <div>Pending: <strong>KSh {Number(report.revenue.pending||0).toLocaleString()}</strong></div>
                </div>
              </div>
            )}
          </div>
        )}
        {activeTab==='profile' && (
          <div className="card">
            <div className="card-header">
              <svg className="icon" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="8" r="3" stroke="#5bc0be" strokeWidth="1.5"/><path d="M4 20a8 8 0 0116 0" stroke="#5bc0be" strokeWidth="1.5"/></svg>
              <h3 className="card-title">My Profile</h3>
            </div>
            <div className="muted" style={{ marginBottom: 8 }}>
              <div><strong>Name:</strong> {me?.name || '-'}</div>
              <div><strong>Email:</strong> {me?.email || '-'}</div>
              <div><strong>Role:</strong> caretaker</div>
              <div><strong>Estate:</strong> {me?.Estate?.name || me?.estateId || '-'}</div>
              <div><strong>Apartment:</strong> {me?.Apartment?.number || me?.apartmentId || '-'}</div>
            </div>
            <ProfileEditor role="caretaker" token={token} me={me} onUpdated={async()=>{ try { setMe(await api('/api/landlords/caretakers/me', { token })); } catch {} }} />
          </div>
        )}
      </section>
    </div>
  );
}

function TenantPay({ token, onPaid }) {
  const toast = useToast();
  const [amount, setAmount] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const submit = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      if (!amount || !phone) throw new Error('Amount and phone required');
      const init = await api('/api/payments/mpesa/initiate', { method:'POST', token, body:{ amount: Number(amount), phone } });
      await api('/api/payments/mpesa/complete', { method:'POST', token, body:{ paymentId: init.paymentId, success: true } });
      toast.add('Payment successful (mock)', 'success');
      setAmount(''); setPhone('');
      onPaid && onPaid();
    } catch (err) {
      toast.add(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };
  return (
    <form onSubmit={submit}>
      <label>Amount</label>
      <input value={amount} onChange={e=>setAmount(e.target.value)} placeholder="e.g. 1000" />
      <label>Phone (07XXXXXXXX)</label>
      <input value={phone} onChange={e=>setPhone(e.target.value)} placeholder="07XXXXXXXX" />
      <button className="btn" disabled={loading}>{loading ? 'Processing…' : 'Pay with M-Pesa'}</button>
    </form>
  );
}

function ProfileEditor({ role, token, me, onUpdated }) {
  const toast = useToast();
  const [name, setName] = React.useState(me?.name || '');
  const [phone, setPhone] = React.useState(me?.phone || '');
  const [photoUrl, setPhotoUrl] = React.useState(me?.photoUrl || '');
  const [uploading, setUploading] = React.useState(false);
  React.useEffect(() => { setName(me?.name||''); setPhone(me?.phone||''); setPhotoUrl(me?.photoUrl||''); }, [me]);
  const save = async (e) => {
    e.preventDefault();
    try {
      if (role === 'tenant') await api('/api/tenants/me', { method:'PATCH', token, body:{ name, phone, photoUrl } });
      else if (role === 'landlord') await api('/api/landlords/me', { method:'PATCH', token, body:{ name, phone, photoUrl } });
      else if (role === 'caretaker') await api('/api/landlords/caretakers/me', { method:'PATCH', token, body:{ name, phone, photoUrl } });
      toast.add('Profile updated', 'success');
      onUpdated && onUpdated();
    } catch (err) {
      toast.add(err.message, 'error');
    }
  };
  const onFile = async (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    try {
      setUploading(true);
      const fd = new FormData();
      fd.append('file', file);
      const res = await api('/api/uploads/profile', { method:'POST', token, body: fd, isMultipart: true });
      if (res?.url) setPhotoUrl(res.url);
      toast.add('Photo uploaded', 'success');
    } catch (err) {
      toast.add(err.message, 'error');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };
  return (
    <form onSubmit={save}>
      <div style={{ display:'flex', gap:12, alignItems:'center', marginBottom:8 }}>
        <div style={{ width:56, height:56, borderRadius:'50%', background:'linear-gradient(135deg, var(--accent), var(--accent-2))', overflow:'hidden', display:'flex', alignItems:'center', justifyContent:'center' }}>
          {photoUrl ? <img src={photoUrl} alt="avatar" style={{ width:'100%', height:'100%', objectFit:'cover' }} onError={(e)=>{ e.currentTarget.style.display='none'; }} /> : <span style={{ color:'#04121d', fontWeight:800 }}>{(me?.name||'U').slice(0,1).toUpperCase()}</span>}
        </div>
        <div style={{ display:'flex', flexDirection:'column' }}>
          <div className="muted">Update your profile name, phone and photo</div>
          <label className="btn classic" style={{ width:'fit-content', marginTop:6 }}>
            {uploading ? 'Uploading…' : 'Upload photo'}
            <input type="file" accept="image/*" onChange={onFile} style={{ display:'none' }} />
          </label>
        </div>
      </div>
      <label>Name</label>
      <input value={name} onChange={e=>setName(e.target.value)} />
      <label>Phone</label>
      <input value={phone} onChange={e=>setPhone(e.target.value)} />
      <label>Photo URL</label>
      <input value={photoUrl} onChange={e=>setPhotoUrl(e.target.value)} placeholder="https://..." />
      <button className="btn" style={{ marginTop:8 }}>Save changes</button>
    </form>
  );
}

function LandlordReminders({ token, estates }) {
  const toast = useToast();
  const [estateId, setEstateId] = useState('');
  const [title, setTitle] = useState('Rent Reminder');
  const [message, setMessage] = useState('Your rent is due. Kindly make payment.');
  const [loading, setLoading] = useState(false);
  const send = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      if (!estateId) throw new Error('Select an estate');
      const res = await api('/api/payments/reminders/estate', { method:'POST', token, body:{ estateId, title, message } });
      toast.add(`Reminders sent: ${res.sent}`, 'success');
    } catch (err) {
      toast.add(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };
  return (
    <form onSubmit={send}>
      <label>Estate</label>
      <select value={estateId} onChange={e=>setEstateId(e.target.value)}>
        <option value="">Select an estate</option>
        {estates.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
      </select>
      <label>Title</label>
      <input value={title} onChange={e=>setTitle(e.target.value)} />
      <label>Message</label>
      <textarea value={message} onChange={e=>setMessage(e.target.value)} />
      <button className="btn" disabled={loading}>{loading ? 'Sending…' : 'Send Reminders'}</button>
    </form>
  );
}

function Home() {
  const { token, role } = useAuth();
  const [featuresIn, setFeaturesIn] = React.useState(false);
  React.useEffect(() => {
    const done = sessionStorage.getItem('featuresAnimated');
    if (done) {
      setFeaturesIn(true);
      return;
    }
    const t = setTimeout(() => {
      setFeaturesIn(true);
      try { sessionStorage.setItem('featuresAnimated', '1'); } catch {}
    }, 100);
    return () => clearTimeout(t);
  }, []);
  const onCtaClick = (e) => {
    try {
      const el = e.currentTarget;
      el.classList.remove('btn-click');
      // Force reflow to restart animation
      // eslint-disable-next-line no-unused-expressions
      el.offsetWidth;
      el.classList.add('btn-click');
      setTimeout(() => el.classList.remove('btn-click'), 320);
    } catch {}
  };
  return (
    <div className="hero">
      <section className="section">
        <div className="hero-card">
          <h2 style={{ margin: 0 }}>All-in-one rental management</h2>
          <p className="subtitle">Collect rent, resolve repairs, and keep everyone in the loop — fast and simple.</p>
          <div className="cta">
            {!token ? (
              <>
                <Link className="btn" to="/signin" onClick={onCtaClick}>Sign In</Link>
                <Link className="btn classic" to="/register" onClick={onCtaClick}>Create Account</Link>
              </>
            ) : (
              <>
                <Link className="btn" to={role==='tenant' ? '/tenant' : role==='landlord' ? '/landlord' : '/caretaker'} onClick={onCtaClick}>Go to Dashboard</Link>
              </>
            )}
          </div>
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(220px, 1fr))', gap:16, marginTop:16 }}>
          <div className={`feature ${featuresIn ? 'animated-in' : 'animated'}`}>
            <div className="icon" aria-hidden>
              <svg viewBox="0 0 24 24" fill="none"><path d="M3 7h18M3 12h18M3 17h18" stroke="#5bc0be" strokeWidth="1.5"/></svg>
            </div>
            <h3>Collect rent faster</h3>
            <p>Track payments and export reports in one place.</p>
          </div>
          <div className={`feature ${featuresIn ? 'animated-in delay1' : 'animated'}`}>
            <div className="icon" aria-hidden>
              <svg viewBox="0 0 24 24" fill="none"><path d="M7 7h10v10H7z" stroke="#5bc0be" strokeWidth="1.5"/><path d="M9 12h6" stroke="#5bc0be" strokeWidth="1.5"/></svg>
            </div>
            <h3>Fix issues quickly</h3>
            <p>Tickets move from open to done with clear updates.</p>
          </div>
          <div className={`feature ${featuresIn ? 'animated-in delay2' : 'animated'}`}>
            <div className="icon" aria-hidden>
              <svg viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="9" stroke="#5bc0be" strokeWidth="1.5"/><path d="M12 7v5l3 3" stroke="#5bc0be" strokeWidth="1.5"/></svg>
            </div>
            <h3>Save time every day</h3>
            <p>Smart defaults help you get work done faster.</p>
          </div>
          <div className={`feature ${featuresIn ? 'animated-in delay3' : 'animated'}`}>
            <div className="icon" aria-hidden>
              <svg viewBox="0 0 24 24" fill="none"><path d="M4 7h16v10H4z" stroke="#5bc0be" strokeWidth="1.5"/><path d="M8 12h8" stroke="#5bc0be" strokeWidth="1.5"/></svg>
            </div>
            <h3>Stay in sync</h3>
            <p>Notices and updates keep everyone informed in real time.</p>
          </div>
        </div>
      </section>
    </div>
  );
}

function ForgotPassword() {
  const toast = useToast();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [devLink, setDevLink] = useState('');
  const onSubmit = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      const res = await api('/api/auth/forgot', { method:'POST', body:{ email } });
      if (res && res.resetUrl) setDevLink(res.resetUrl);
      setSent(true);
      toast.add('If the email exists, a reset link was sent.', 'success');
    } catch (err) {
      toast.add(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };
  return (
    <div className="auth-page with-illustration">
      <div className="auth-card">
      <h2>Forgot Password</h2>
      {sent ? (
        <>
          <p>Check your email for a reset link. If you don’t see it, check spam.</p>
          {devLink && (
            <p>
              Dev link: <a href={devLink} style={{ color:'#5bc0be' }}>{devLink}</a>
            </p>
          )}
        </>
      ) : (
        <form onSubmit={onSubmit}>
          <div className="field">
            <span className="field-icon" aria-hidden>
              <svg viewBox="0 0 24 24" fill="none"><path d="M3 7l9 6 9-6" stroke="#94a3b8" strokeWidth="1.5"/><rect x="3" y="5" width="18" height="14" rx="2" stroke="#94a3b8" strokeWidth="1.5"/></svg>
            </span>
            <input placeholder="Your email" value={email} onChange={e=>setEmail(e.target.value)} disabled={loading} />
          </div>
          <button className="btn full" disabled={loading}>{loading ? 'Sending…' : 'Send reset link'}</button>
        </form>
      )}
      </div>
    </div>
  );
}

function ResetPassword() {
  const toast = useToast();
  const navigate = useNavigate();
  const params = new URLSearchParams(window.location.search);
  const token = params.get('token') || '';
  const email = params.get('email') || '';
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const onSubmit = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      await api('/api/auth/reset', { method:'POST', body:{ email, token, password } });
      toast.add('Password updated. Please sign in.', 'success');
      navigate('/signin', { replace: true });
    } catch (err) {
      toast.add(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };
  return (
    <div className="auth-page with-illustration">
      <div className="auth-card">
        <h2>Reset Password</h2>
        <form onSubmit={onSubmit}>
          <div className="field">
            <span className="field-icon" aria-hidden>
              <svg viewBox="0 0 24 24" fill="none"><rect x="4" y="10" width="16" height="10" rx="2" stroke="#94a3b8" strokeWidth="1.5"/><path d="M8 10V7a4 4 0 018 0v3" stroke="#94a3b8" strokeWidth="1.5"/></svg>
            </span>
            <input placeholder="New password" type={showPassword?'text':'password'} value={password} onChange={e=>setPassword(e.target.value)} disabled={loading} />
            <button type="button" className="field-action" aria-label={showPassword? 'Hide password':'Show password'} onClick={()=>setShowPassword(s=>!s)}>
              {showPassword ? (
                <svg viewBox="0 0 24 24" fill="none"><path d="M3 3l18 18" stroke="#94a3b8" strokeWidth="1.5"/><path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7-10-7-10-7z" stroke="#94a3b8" strokeWidth="1.5"/></svg>
              ) : (
                <svg viewBox="0 0 24 24" fill="none"><path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7-10-7-10-7z" stroke="#94a3b8" strokeWidth="1.5"/><circle cx="12" cy="12" r="3" stroke="#94a3b8" strokeWidth="1.5"/></svg>
              )}
            </button>
          </div>
          <button className="btn full" disabled={loading}>{loading ? 'Updating…' : 'Update password'}</button>
        </form>
      </div>
    </div>
  );
}

function Register() {
  const toast = useToast();
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showRegPass, setShowRegPass] = useState(false);
  const [role, setRole] = useState('tenant');
  const [name, setName] = useState('');
  const [idNumber, setIdNumber] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const onSubmit = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      if (!email.trim() || !password.trim()) throw new Error('Email and password are required');
  if (role !== 'caretaker' && (!name.trim() || !idNumber.trim())) throw new Error('Name and ID number are required');
  let body = { email, password, role };
  if (role !== 'caretaker') { body.name = name; body.idNumber = idNumber; }
      if (role === 'caretaker') {
        if (!inviteCode.trim()) throw new Error('Invite code is required for caretakers');
        body.inviteCode = inviteCode.trim();
      }
      const res = await api('/api/auth/register', { method:'POST', body });
      if (res?.token && res?.role) {
        login(res.token, res.role);
        toast.add('Account created. You are now signed in.', 'success');
  navigate(res.role === 'landlord' || res.role === 'caretaker' ? '/landlord' : '/tenant', { replace: true });
      } else {
        // Fallback if backend did not return token (should not happen with current backend)
        toast.add('Registered. Please sign in.', 'success');
      }
    } catch (err) {
      setError(err.message);
      toast.add(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };
  return (
    <div className="auth-page with-illustration">
      <div className="auth-card">
        <h2 className="auth-title">Create your account</h2>
        <p className="auth-subtitle">Join and start managing rentals in minutes</p>
        <form onSubmit={onSubmit}>
          <div className="field">
            <span className="field-icon" aria-hidden>
              <svg viewBox="0 0 24 24" fill="none"><path d="M3 7l9 6 9-6" stroke="#94a3b8" strokeWidth="1.5"/><rect x="3" y="5" width="18" height="14" rx="2" stroke="#94a3b8" strokeWidth="1.5"/></svg>
            </span>
            <input placeholder="Email" value={email} onChange={e=>setEmail(e.target.value)} disabled={loading} />
          </div>
          {error && !email && <div className="error">Email is required</div>}
          <div className="field">
            <span className="field-icon" aria-hidden>
              <svg viewBox="0 0 24 24" fill="none"><rect x="4" y="10" width="16" height="10" rx="2" stroke="#94a3b8" strokeWidth="1.5"/><path d="M8 10V7a4 4 0 018 0v3" stroke="#94a3b8" strokeWidth="1.5"/></svg>
            </span>
            <input placeholder="Password" type={showRegPass?'text':'password'} value={password} onChange={e=>setPassword(e.target.value)} disabled={loading} />
            <button type="button" className="field-action" aria-label={showRegPass? 'Hide password':'Show password'} onClick={()=>setShowRegPass(s=>!s)}>
              {showRegPass ? (
                <svg viewBox="0 0 24 24" fill="none"><path d="M3 3l18 18" stroke="#94a3b8" strokeWidth="1.5"/><path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7-10-7-10-7z" stroke="#94a3b8" strokeWidth="1.5"/></svg>
              ) : (
                <svg viewBox="0 0 24 24" fill="none"><path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7-10-7-10-7z" stroke="#94a3b8" strokeWidth="1.5"/><circle cx="12" cy="12" r="3" stroke="#94a3b8" strokeWidth="1.5"/></svg>
              )}
            </button>
          </div>
          {error && !password && <div className="error">Password is required</div>}
          <div className="field">
            <span className="field-icon" aria-hidden>
              <svg viewBox="0 0 24 24" fill="none"><circle cx="12" cy="8" r="3" stroke="#94a3b8" strokeWidth="1.5"/><path d="M4 20a8 8 0 0116 0" stroke="#94a3b8" strokeWidth="1.5"/></svg>
            </span>
            <input placeholder="Full name" value={name} onChange={e=>setName(e.target.value)} disabled={loading} />
          </div>
          {error && !name && <div className="error">Name is required</div>}
          <div className="field">
            <span className="field-icon" aria-hidden>
              <svg viewBox="0 0 24 24" fill="none"><rect x="3" y="5" width="18" height="14" rx="2" stroke="#94a3b8" strokeWidth="1.5"/><path d="M7 9h6" stroke="#94a3b8" strokeWidth="1.5"/><circle cx="17" cy="15" r="2" stroke="#94a3b8" strokeWidth="1.5"/></svg>
            </span>
            <input placeholder="ID number" value={idNumber} onChange={e=>setIdNumber(e.target.value)} disabled={loading} />
          </div>
          {error && !idNumber && <div className="error">ID number is required</div>}
          <label>Role</label>
          <select value={role} onChange={e=>setRole(e.target.value)} disabled={loading}>
            <option value="tenant">Tenant</option>
            <option value="landlord">Landlord</option>
            <option value="caretaker">Caretaker</option>
          </select>
          {role === 'caretaker' && (
            <>
              <label>Invite Code</label>
              <input placeholder="Enter invite code from landlord" value={inviteCode} onChange={e=>setInviteCode(e.target.value)} disabled={loading} />
            </>
          )}
          <button type="submit" className="btn full" disabled={loading}>
            {loading ? (<><span className="spinner" aria-hidden="true"></span> Creating…</>) : 'Create Account'}
          </button>
          {error && <p className="error">{error}</p>}
        </form>
        <div className="auth-links">
          <span>Already have an account?</span>
          <Link to="/signin">Sign in</Link>
        </div>
      </div>
    </div>
  );
}

function AuthWatch() {
  const { logout } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const lastRef = React.useRef(0);
  useEffect(() => {
    const onUnauthorized = () => {
      const now = Date.now();
      if (now - lastRef.current < 3000) return; // debounce
      lastRef.current = now;
      toast.add('Session expired. Please sign in again.', 'error', {
        label: 'Re-login',
        onClick: () => { try { logout(); } catch {}; navigate('/signin'); }
      });
    };
    window.addEventListener('api:unauthorized', onUnauthorized);
    return () => window.removeEventListener('api:unauthorized', onUnauthorized);
  }, [logout, toast, navigate]);
  return null;
}

export default function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <BrowserRouter>
          <AuthWatch />
          <Layout>
            <AnimatedRoutes />
          </Layout>
        </BrowserRouter>
      </ToastProvider>
    </AuthProvider>
  );
}

function AnimatedRoutes() {
  const location = useLocation();
  return (
    <div key={location.pathname} className="route-fade">
      <Routes location={location}>
        <Route path="/" element={<Home />} />
        <Route path="/signin" element={<SignIn />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/tenant" element={<RequireAuth role="tenant"><div><TenantDashboard /></div></RequireAuth>} />
        <Route path="/landlord" element={<RequireAuth role="landlord"><div><LandlordDashboard /></div></RequireAuth>} />
        <Route path="/caretaker" element={<RequireAuth role="caretaker"><div><CaretakerDashboard /></div></RequireAuth>} />
      </Routes>
    </div>
  );
}

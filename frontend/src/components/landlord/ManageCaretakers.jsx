import React, { useEffect, useState, useRef } from 'react';
import { api } from '../../lib/api';

function Modal({ open, title, children, onClose }) {
  const dialogRef = useRef(null);
  useEffect(() => {
    if (!open) return;
    const prev = document.activeElement;
    setTimeout(() => { dialogRef.current && dialogRef.current.focus(); }, 0);
    const onKey = (e) => { if (e.key === 'Escape') onClose && onClose(); };
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('keydown', onKey); try { prev && prev.focus(); } catch {} };
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="modal-backdrop" role="presentation" onClick={(e)=>{ if (e.target === e.currentTarget) onClose && onClose(); }}>
      <div className="modal-dialog" role="dialog" aria-modal="true" aria-label={title} ref={dialogRef} tabIndex={-1}>
        <h3>{title}</h3>
        {children}
      </div>
    </div>
  );
}

export default function ManageCaretakers({ token, estates }) {
  const [caretakers, setCaretakers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [idNumber, setIdNumber] = useState('');
  const [createUserAccount, setCreateUserAccount] = useState(false);
  const [returnCredentials, setReturnCredentials] = useState(false);
  const [estateId, setEstateId] = useState('');
  const [apartmentId, setApartmentId] = useState('');
  const [msg, setMsg] = useState('');
  const [setupResult, setSetupResult] = useState(null);
  const [setupCopied, setSetupCopied] = useState(false);
  // Invite flow deprecated: owners create property managers directly

  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [assignTarget, setAssignTarget] = useState(null);
  const [assignApartmentId, setAssignApartmentId] = useState('');

  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [helpModalOpen, setHelpModalOpen] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const list = await api('/api/landlords/caretakers', { token });
      setCaretakers(list || []);
    } catch (err) { setMsg(err.message || 'Failed to load'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const create = async (e) => {
    e.preventDefault();
    try {
      const body = { name, email, idNumber, estateId: estateId || null, apartmentId: apartmentId || null };
      if (createUserAccount) { body.createUser = true; if (returnCredentials) body.returnCredentials = true; }
      const res = await api('/api/landlords/caretakers', { method: 'POST', token, body });
      if (res?.setup) {
        setSetupResult(res.setup);
        setSetupCopied(false);
        setMsg('Account created — copy setup token now.');
      } else {
        setMsg(res?.note || 'Property manager created');
      }
      setName(''); setEmail(''); setIdNumber(''); setEstateId(''); setApartmentId('');
      await load();
    } catch (err) { setMsg(err.message || 'Create failed'); }
  };

  // Invite flow removed; owners should create managers via the form above.

  const assignToApartment = async (c) => {
    setAssignTarget(c);
    setAssignApartmentId(c.apartmentId || '');
    setAssignModalOpen(true);
  };

  const doAssign = async () => {
    try {
      if (!assignApartmentId) { setMsg('Provide apartment id'); return; }
      await api(`/api/landlords/apartments/${assignApartmentId}/assign-caretaker`, { method: 'POST', token, body: { caretakerId: assignTarget.id } });
      setMsg('Assigned');
      await load();
    } catch (err) { setMsg(err.message || 'Assign failed'); }
    finally { setAssignModalOpen(false); setAssignTarget(null); setAssignApartmentId(''); }
  };

  const remove = async (c) => {
    setDeleteTarget(c);
    setDeleteModalOpen(true);
  };

  const doDelete = async () => {
    try {
      await api(`/api/landlords/caretakers/${deleteTarget.id}`, { method: 'DELETE', token });
      setMsg('Deleted');
      await load();
    } catch (err) { setMsg(err.message || 'Delete failed'); }
    finally { setDeleteModalOpen(false); setDeleteTarget(null); }
  };

  return (
    <>
    <div>
  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
    <h3 style={{ margin: 0 }}>Manage Property Managers</h3>
    <button title="How this works" className="btn classic" onClick={()=>setHelpModalOpen(true)}>?</button>
  </div>
      {msg && <div className="muted" style={{ marginBottom: 8 }}>{msg}</div>}
      {setupResult && (
        <div className="card" style={{ marginBottom: 12, border: '1px solid #ddd', padding: 12 }}>
          <h4>One-time setup token</h4>
          <div style={{ marginBottom: 8 }}><a href={setupResult.url} target="_blank" rel="noreferrer">Open setup link</a></div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <div style={{ flex: 1 }}><code>{setupResult.token}</code></div>
            <div>
              <button className="btn classic" onClick={async () => {
                try { await navigator.clipboard.writeText(setupResult.token); setSetupCopied(true); } catch (e) { const ta = document.createElement('textarea'); ta.value = setupResult.token; document.body.appendChild(ta); ta.select(); document.execCommand('copy'); document.body.removeChild(ta); setSetupCopied(true); }
              }}>{setupCopied ? 'Copied' : 'Copy'}</button>
            </div>
            <div>
              <button className="btn" onClick={() => { setSetupResult(null); setSetupCopied(false); setMsg('Setup token acknowledged'); }}>I copied</button>
            </div>
          </div>
          <div style={{ marginTop: 8 }} className="muted">This token is shown once. Clear it after copying.</div>
        </div>
      )}
      <div className="card" style={{ marginBottom: 12 }}>
        <form onSubmit={create}>
          <label htmlFor="ct-name">Name</label>
          <input id="ct-name" value={name} onChange={e=>setName(e.target.value)} />
          <label htmlFor="ct-email">Email</label>
          <input id="ct-email" type="email" value={email} onChange={e=>setEmail(e.target.value)} />
          <label htmlFor="ct-id">ID Number</label>
          <input id="ct-id" value={idNumber} onChange={e=>setIdNumber(e.target.value)} />
          <label htmlFor="ct-estate">Assign to Estate (optional)</label>
          <select id="ct-estate" value={estateId} onChange={e=>setEstateId(e.target.value)}>
            <option value="">None</option>
            {(estates||[]).map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          <label htmlFor="ct-apartment">Apartment ID (optional)</label>
          <input id="ct-apartment" value={apartmentId} onChange={e=>setApartmentId(e.target.value)} placeholder="Apartment ID" />
          <div style={{ marginTop: 8 }}>
            <label style={{ display: 'block', marginTop: 8 }}><input type="checkbox" checked={createUserAccount} onChange={e=>setCreateUserAccount(e.target.checked)} /> Create user account?</label>
            {createUserAccount && (
              <label style={{ display: 'block', marginTop: 6 }}><input type="checkbox" checked={returnCredentials} onChange={e=>setReturnCredentials(e.target.checked)} /> Return setup token (dev only)</label>
            )}
            <button type="submit" className="btn">Create Property Manager</button>
          </div>
        </form>
      </div>

      <div className="card">
        <h4>Existing Property Managers</h4>
        {loading ? <div className="muted">Loading…</div> : (
          <table className="table">
            <thead><tr><th scope="col">Name</th><th scope="col">Email</th><th scope="col">Estate</th><th scope="col">Apartment</th><th scope="col">Actions</th></tr></thead>
            <tbody>
              {(caretakers||[]).length === 0 ? (
                <tr><td colSpan={5} className="muted">No property managers found.</td></tr>
              ) : (caretakers.map(c => (
                <tr key={c.id}>
                  <td>{c.name || '-'}</td>
                  <td>{c.email || '-'}</td>
                  <td>{c.Estate?.name || '-'}</td>
                  <td>{c.Apartment?.number || c.apartmentId || '-'}</td>
                  <td>
                    <button type="button" aria-label={`Create account for ${c.email || c.name}`} className="btn classic" onClick={async ()=>{
                      try {
                        const res = await api(`/api/landlords/caretakers`, { method: 'POST', token, body: { name: c.name, email: c.email, estateId: c.estateId || null, apartmentId: c.apartmentId || null, createUser: true } });
                        if (res?.setup) {
                          setSetupResult(res.setup);
                          setSetupCopied(false);
                          setMsg('Account created — copy setup token now.');
                        } else {
                          setMsg('Account created.');
                        }
                        await load();
                      } catch (err) { setMsg(err.message || 'Create account failed'); }
                    }}>Create Account</button>{' '}
                    <button type="button" aria-label={`Assign ${c.email || c.name} to apartment`} className="btn" onClick={()=>assignToApartment(c)}>Assign to apt</button>{' '}
                    <button type="button" aria-label={`Delete ${c.email || c.name}`} className="btn warn" onClick={()=>remove(c)}>Delete</button>
                  </td>
                </tr>
              )))}
            </tbody>
          </table>
        )}
      </div>
    </div>
    

    {/* Assign modal */}
    <Modal open={assignModalOpen} title={`Assign ${assignTarget?.name || ''} to apartment`} onClose={()=>setAssignModalOpen(false)}>
      <label>Apartment ID</label>
      <input value={assignApartmentId} onChange={e=>setAssignApartmentId(e.target.value)} placeholder="Apartment ID" />
      <div style={{ marginTop:12, display:'flex', gap:8, justifyContent:'flex-end' }}>
        <button className="btn classic" onClick={()=>setAssignModalOpen(false)}>Cancel</button>
        <button className="btn" onClick={doAssign}>Assign</button>
      </div>
    </Modal>

    {/* Delete modal */}
    <Modal open={deleteModalOpen} title={`Delete ${deleteTarget?.name || ''}?`} onClose={()=>setDeleteModalOpen(false)}>
      <div className="muted">This action cannot be undone. Are you sure?</div>
      <div style={{ marginTop:12, display:'flex', gap:8, justifyContent:'flex-end' }}>
        <button className="btn classic" onClick={()=>setDeleteModalOpen(false)}>Cancel</button>
        <button className="btn warn" onClick={doDelete}>Delete</button>
      </div>
    </Modal>
    </>
  );
}

// Help modal content is owner-facing guidance about the new workflow
function HelpModal({ open, onClose }) {
  return (
    <Modal open={open} title="How owner-managed Property Managers work" onClose={onClose}>
      <div style={{ maxWidth: 640 }}>
        <p>Owners (landlords) can now create and manage Property Managers directly from this page.</p>
        <h4>Create a Property Manager</h4>
        <ol>
          <li>Fill in the name and email and optionally assign to an estate or apartment.</li>
          <li>Optionally check <em>Create user account</em> to create a login for the manager.</li>
          <li>If you check <em>Return setup token (dev only)</em> and the backend is configured for dev return, a one-time setup link/token will be shown — copy it now.</li>
        </ol>
        <h4>Security guidance</h4>
        <ul>
          <li>The setup token is sensitive and shown only once. Copy it immediately and acknowledge you saved it.</li>
          <li>In production, tokens are not returned by the API — instead the manager should use the password reset flow to set their password.</li>
          <li>Do not share the token in insecure channels. If you lose it, create the account again or trigger a password reset.</li>
        </ul>
        <h4>Audit & email</h4>
        <p>This system can be configured to automatically email the setup link to the manager when SMTP is enabled. Contact your administrator to enable that behavior.</p>
        <div style={{ marginTop: 12, display: 'flex', justifyContent: 'flex-end' }}>
          <button className="btn classic" onClick={onClose}>Close</button>
        </div>
      </div>
    </Modal>
  );
}

import React, { useState, useEffect } from 'react';
import { api } from '../../lib/api';

export default function InviteCaretaker({ token, estates, onInvite }) {
  const [estateId, setEstateId] = useState('');
  const [apts, setApts] = useState([]);
  const [apartmentId, setApartmentId] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      if (!estateId) { setApts([]); setApartmentId(''); return; }
      try {
        const res = await api(`/api/public/estates/${estateId}/apartments`);
        if (mounted) setApts(res || []);
      } catch (e) {}
    })();
    return () => { mounted = false; };
  }, [estateId]);

  const [createUserAccount, setCreateUserAccount] = useState(false);
  const [returnCredentials, setReturnCredentials] = useState(false);
  const [copied, setCopied] = useState(false);
  const [acknowledged, setAcknowledged] = useState(false);
  // name/email were added earlier
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      const body = {};
      if (estateId) body.estateId = Number(estateId);
      if (apartmentId) body.apartmentId = Number(apartmentId);
      if (createUserAccount) { body.createUser = true; if (returnCredentials) body.returnCredentials = true; }
      // Create property manager directly (no invite code)
      const res = await api('/api/landlords/caretakers', { method: 'POST', token, body: { estateId: body.estateId, apartmentId: body.apartmentId, email: '', name: '', createUser: body.createUser, returnCredentials: body.returnCredentials } });
      setResult(res);
      if (res && res.setup) {
        setCopied(false);
        setAcknowledged(false);
      }
      onInvite && onInvite(res);
    } catch (err) {
      setResult({ error: err.message });
    } finally { setLoading(false); }
  };

  return (
    <div className="p-4 bg-white rounded shadow">
      <h4 className="text-lg font-medium mb-2">Create Property Manager</h4>
      <form onSubmit={submit} className="space-y-2">
        <label>Name (optional)</label>
        <input value={name} onChange={e=>setName(e.target.value)} />
        <label>Email</label>
        <input type="email" value={email} onChange={e=>setEmail(e.target.value)} />
        <select className="input" value={estateId} onChange={e=>setEstateId(e.target.value)}>
          <option value="">Select estate (optional)</option>
          {(estates||[]).map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
        </select>
        <select className="input" value={apartmentId} onChange={e=>setApartmentId(e.target.value)} disabled={!estateId}>
          <option value="">None</option>
          {(apts||[]).map(a => <option key={a.id} value={a.id}>{a.number || a.id}</option>)}
        </select>
        <div className="flex items-center gap-2">
          <button className="btn bg-blue-600 text-white px-3 py-1 rounded" disabled={loading}>{loading ? 'Creating…' : 'Create Property Manager'}</button>
          {result?.setup && (
            <div className="ml-2 setup-box" style={{ border: '1px dashed #ccc', padding: 8, borderRadius: 6 }}>
              <div style={{ marginBottom: 6 }}><strong>Setup URL:</strong> <a href={result.setup.url} target="_blank" rel="noreferrer">Open setup link</a></div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ flex: 1 }}><strong>Token:</strong> <code>{result.setup.token}</code></div>
                <div>
                  <button type="button" className="btn classic" onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(result.setup.token);
                      setCopied(true);
                    } catch (err) {
                      // fallback
                      const el = document.createElement('textarea');
                      el.value = result.setup.token;
                      document.body.appendChild(el);
                      el.select();
                      document.execCommand('copy');
                      document.body.removeChild(el);
                      setCopied(true);
                    }
                  }}>{copied ? 'Copied' : 'Copy'}</button>
                </div>
                <div>
                  <button type="button" className="btn" onClick={() => { setAcknowledged(true); setResult(null); }}>{acknowledged ? 'Acknowledged' : 'I copied'}</button>
                </div>
              </div>
              <div style={{ marginTop: 6 }} className="muted">This token is shown once. If you close this dialog without copying, you cannot retrieve it again.</div>
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          <label><input type="checkbox" checked={createUserAccount} onChange={e=>setCreateUserAccount(e.target.checked)} /> Create user account?</label>
          <label><input type="checkbox" checked={returnCredentials} onChange={e=>setReturnCredentials(e.target.checked)} /> Return credentials (dev only)</label>
        </div>
      </form>
    </div>
  );
}

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

  const submit = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      const body = {};
      if (estateId) body.estateId = Number(estateId);
      if (apartmentId) body.apartmentId = Number(apartmentId);
      const res = await api('/api/landlords/caretakers/invite', { method: 'POST', token, body });
      setResult(res);
      onInvite && onInvite(res);
    } catch (err) {
      setResult({ error: err.message });
    } finally { setLoading(false); }
  };

  return (
    <div className="p-4 bg-white rounded shadow">
      <h4 className="text-lg font-medium mb-2">Invite Caretaker</h4>
      <form onSubmit={submit} className="space-y-2">
        <select className="input" value={estateId} onChange={e=>setEstateId(e.target.value)}>
          <option value="">Select estate (optional)</option>
          {(estates||[]).map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
        </select>
        <select className="input" value={apartmentId} onChange={e=>setApartmentId(e.target.value)} disabled={!estateId}>
          <option value="">None</option>
          {(apts||[]).map(a => <option key={a.id} value={a.id}>{a.number || a.id}</option>)}
        </select>
        <div className="flex items-center gap-2">
          <button className="btn bg-blue-600 text-white px-3 py-1 rounded" disabled={loading}>{loading ? 'Generating…' : 'Generate Invite Code'}</button>
          {result?.code && <code className="bg-gray-100 px-2 py-1 rounded">{result.code}</code>}
        </div>
      </form>
    </div>
  );
}

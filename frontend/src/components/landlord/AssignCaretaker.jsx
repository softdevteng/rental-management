import React, { useState } from 'react';
import { api } from '../../lib/api';

export default function AssignCaretaker({ token, estates, onAssigned }) {
  const [estateId, setEstateId] = useState('');
  const [caretakerId, setCaretakerId] = useState('');
  const [loading, setLoading] = useState(false);
  const submit = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      if (!estateId || !caretakerId) throw new Error('Estate and property manager are required');
      await api(`/api/landlords/estates/${estateId}/assign-caretaker`, { method: 'POST', token, body: { caretakerId: Number(caretakerId) } });
      onAssigned && onAssigned();
    } catch (err) { alert(err.message); }
    finally { setLoading(false); }
  };
  return (
    <form onSubmit={submit} className="p-4 bg-white rounded shadow space-y-2">
      <h4 className="text-lg font-medium">Assign Property Manager</h4>
      <select className="input" value={estateId} onChange={e=>setEstateId(e.target.value)}>
        <option value="">Select estate</option>
        {(estates||[]).map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
      </select>
      <input className="input" placeholder="Property Manager ID" value={caretakerId} onChange={e=>setCaretakerId(e.target.value)} />
      <button className="btn bg-blue-600 text-white px-3 py-1 rounded" disabled={loading}>{loading ? 'Assigning…' : 'Assign'}</button>
    </form>
  );
}

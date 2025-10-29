import React, { useState } from 'react';
import { api } from '../../lib/api';

export default function ApartmentForm({ token, estates, onCreated }) {
  const [estateId, setEstateId] = useState('');
  const [number, setNumber] = useState('');
  const [rent, setRent] = useState('');
  const [deposit, setDeposit] = useState('');
  const [loading, setLoading] = useState(false);
  const create = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      if (!estateId || !number) throw new Error('Estate and number are required');
      const res = await api(`/api/landlords/estates/${estateId}/apartments`, { method: 'POST', token, body: { number, rent: Number(rent||0), deposit: Number(deposit||0) } });
      onCreated && onCreated(res);
      setNumber(''); setRent(''); setDeposit(''); setEstateId('');
    } catch (err) { alert(err.message); }
    finally { setLoading(false); }
  };
  return (
    <form onSubmit={create} className="p-4 bg-white rounded shadow space-y-2">
      <h4 className="text-lg font-medium">Add Apartment</h4>
      <select className="input" value={estateId} onChange={e=>setEstateId(e.target.value)}>
        <option value="">Select estate</option>
        {(estates||[]).map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
      </select>
      <div className="flex gap-2">
        <input className="input flex-1" placeholder="Number" value={number} onChange={e=>setNumber(e.target.value)} />
        <button type="button" className="btn classic" onClick={()=>{
          const suffix = String(Date.now()).slice(-6);
          const prefix = estateId ? `EST${estateId}` : 'GEN';
          setNumber(`APT-${prefix}-${suffix}`);
        }}>Generate ID</button>
      </div>
      <div className="flex gap-2">
        <input className="input" placeholder="Rent" value={rent} onChange={e=>setRent(e.target.value)} />
        <input className="input" placeholder="Deposit" value={deposit} onChange={e=>setDeposit(e.target.value)} />
      </div>
      <button className="btn bg-green-600 text-white px-3 py-1 rounded" disabled={loading}>{loading ? 'Creating…' : 'Create'}</button>
    </form>
  );
}

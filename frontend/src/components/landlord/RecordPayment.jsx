import React, { useState } from 'react';
import { api } from '../../lib/api';

export default function RecordPayment({ token, onSaved }) {
  const [tenantId, setTenantId] = useState('');
  const [apartmentId, setApartmentId] = useState('');
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const save = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      if (!tenantId || !apartmentId || !amount) throw new Error('All fields required');
      const res = await api('/api/payments', { method: 'POST', token, body: { tenant: Number(tenantId), apartment: Number(apartmentId), amount: Number(amount) } });
      onSaved && onSaved(res);
      setTenantId(''); setApartmentId(''); setAmount('');
    } catch (err) { alert(err.message); }
    finally { setLoading(false); }
  };
  return (
    <form onSubmit={save} className="p-4 bg-white rounded shadow space-y-2">
      <h4 className="text-lg font-medium">Record Payment</h4>
      <input className="input" placeholder="Tenant ID" value={tenantId} onChange={e=>setTenantId(e.target.value)} />
      <input className="input" placeholder="Apartment ID" value={apartmentId} onChange={e=>setApartmentId(e.target.value)} />
      <input className="input" placeholder="Amount" value={amount} onChange={e=>setAmount(e.target.value)} />
      <button className="btn bg-green-600 text-white px-3 py-1 rounded" disabled={loading}>{loading ? 'Saving…' : 'Save'}</button>
    </form>
  );
}

import React, { useState } from 'react';
import { api } from '../../lib/api';

export default function QuickPay({ token, estates, onSuccess, toast }) {
  const [estateId, setEstateId] = useState('');
  const [apartmentId, setApartmentId] = useState('');
  const [phone, setPhone] = useState('');
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);

  const loadApts = async () => {
    if (!estateId) return [];
    try {
      const list = await api(`/api/public/estates/${estateId}/apartments`);
      return list;
    } catch (e) { return []; }
  };

  const submit = async (e) => {
    e && e.preventDefault();
    try {
      setLoading(true);
      if (!estateId) throw new Error('Select estate');
      if (!apartmentId) throw new Error('Select apartment');
      if (!amount || Number(amount) <= 0) throw new Error('Enter a valid amount');
      if (!phone || !/^07\d{8}$/.test(phone)) throw new Error('Phone must be 07XXXXXXXX');
      const res = await api('/api/landlords/payments/mpesa/initiate', { method: 'POST', token, body: { apartmentId: Number(apartmentId), amount: Number(amount), phone } });
      toast && toast.add('STK Push initiated', 'info');
      onSuccess && onSuccess(res);
      setAmount(''); setPhone('');
    } catch (err) {
      toast && toast.add(err.message, 'error');
    } finally { setLoading(false); }
  };

  return (
    <div className="card">
      <div className="card-header"><h3 className="card-title">Quick Pay (MPesa)</h3></div>
      <form onSubmit={submit} style={{ display:'grid', gap:8 }}>
        <select value={estateId} onChange={e=>{ setEstateId(e.target.value); setApartmentId(''); }}>
          <option value="">Select estate</option>
          {(estates||[]).map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
        </select>
        <input placeholder="Apartment ID" value={apartmentId} onChange={e=>setApartmentId(e.target.value)} />
        <input placeholder="Amount (KSh)" value={amount} onChange={e=>setAmount(e.target.value)} />
        <input placeholder="Phone (07XXXXXXXX)" value={phone} onChange={e=>setPhone(e.target.value)} />
        <div style={{ display:'flex', gap:8 }}>
          <button className="btn" type="submit" disabled={loading}>{loading ? 'Processing…' : 'Initiate STK Push'}</button>
          <button type="button" className="btn classic" onClick={()=>{ setAmount(''); setPhone(''); setApartmentId(''); setEstateId(''); }}>Reset</button>
        </div>
      </form>
    </div>
  );
}

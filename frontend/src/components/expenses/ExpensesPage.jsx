import React, { useEffect, useState } from 'react';
import { api } from '../../lib/api';
import { useAuth } from '../../lib/auth';

export default function ExpensesPage() {
  const { token } = useAuth();
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ amount: '', date: '', category: '', notes: '', estateId: '' });

  const load = async () => {
    try {
      setLoading(true);
      const res = await api('/api/expenses', { token });
      setList(res || []);
    } catch (err) {
      console.error(err);
      alert(err.message || 'Failed to load expenses');
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const onCreate = async (e) => {
    e.preventDefault();
    try {
      const payload = Object.assign({}, form, { amount: parseFloat(form.amount) });
      const created = await api('/api/expenses', { method: 'POST', token, body: payload });
      setList(l => [created, ...l]);
      setForm({ amount: '', date: '', category: '', notes: '', estateId: '' });
    } catch (err) { alert(err.message || 'Failed to create'); }
  };

  const onDelete = async (id) => {
    if (!confirm('Delete this expense?')) return;
    try {
      await api(`/api/expenses/${id}`, { method: 'DELETE', token });
      setList(l => l.filter(x => String(x.id) !== String(id)));
    } catch (err) { alert(err.message || 'Delete failed'); }
  };

  return (
    <div>
      <h3>Expenses</h3>
      <form onSubmit={onCreate} style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(160px,1fr))', gap:8, marginBottom:12 }}>
        <input placeholder="Amount" value={form.amount} onChange={e=>setForm(f=>({ ...f, amount: e.target.value }))} />
        <input placeholder="Date" type="date" value={form.date} onChange={e=>setForm(f=>({ ...f, date: e.target.value }))} />
        <input placeholder="Category" value={form.category} onChange={e=>setForm(f=>({ ...f, category: e.target.value }))} />
        <input placeholder="Estate ID" value={form.estateId} onChange={e=>setForm(f=>({ ...f, estateId: e.target.value }))} />
        <input placeholder="Notes" value={form.notes} onChange={e=>setForm(f=>({ ...f, notes: e.target.value }))} />
        <div style={{ display:'flex', gap:8 }}>
          <button className="btn" type="submit">Add</button>
          <button type="button" className="btn classic" onClick={load}>Refresh</button>
        </div>
      </form>

      {loading ? <div className="muted">Loading…</div> : (
        <table className="table">
          <thead><tr><th>Date</th><th>Amount</th><th>Category</th><th>Estate</th><th>Notes</th><th></th></tr></thead>
          <tbody>
            {list.length === 0 ? (
              <tr><td colSpan={6} className="muted">No expenses</td></tr>
            ) : (
              list.map(e => (
                <tr key={e.id}>
                  <td>{e.date ? new Date(e.date).toLocaleDateString() : '-'}</td>
                  <td>{Number(e.amount).toLocaleString()}</td>
                  <td>{e.category}</td>
                  <td>{e.estateId || '-'}</td>
                  <td>{e.notes}</td>
                  <td><button className="btn classic" onClick={()=>onDelete(e.id)}>Delete</button></td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      )}
    </div>
  );
}
